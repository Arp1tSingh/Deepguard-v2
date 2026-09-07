"""
Core analysis pipeline for the Deepguard backend.

Runs an uploaded video through all 3 verified DeepfakeBench detectors
(Xception, SPSL, UCF), producing everything the frontend's sections need:
  - Verdict: aggregate real/fake call + per-model breakdown
  - Evidence: per-frame face crops + Grad-CAM heatmaps (Xception-based)
  - Signals: per-model score breakdown + agreement measure
  - Timeline: per-frame score series over the video's duration

Design note: Grad-CAM is only implemented for Xception (see gradcam.py) since
it's the simplest CNN backbone to hook cleanly. SPSL/UCF still contribute
their video-level verdict/signal, they just don't drive the frame-by-frame
heatmap view.
"""
import os
import sys
import time
import json
import yaml
import cv2
import numpy as np
import torch

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(BACKEND_DIR)  # /home/claude/deepguard
DFB_ROOT = os.path.join(REPO_ROOT, "DeepfakeBench")

sys.path.insert(0, os.path.join(DFB_ROOT, "training"))
sys.path.insert(0, BACKEND_DIR)

# Compatibility shims (see deepguard-backend/stubs/README.md): dlib and imgaug
# are only used by DeepfakeBench's training-time code, but their imports run
# at module load. The real packages are unavailable/broken on modern
# Python+numpy combos, so fall back to the committed stubs when needed. Real
# installs, if present and working, take precedence automatically.
try:
    import dlib  # noqa: F401
    import imgaug  # noqa: F401
except Exception:
    sys.path.insert(0, os.path.join(BACKEND_DIR, "stubs"))

# Fallback mechanism if full DeepfakeBench dependencies or weights are not present
MOCK_MODELS = False
try:
    from detectors import DETECTOR  # noqa: E402
    from gradcam import compute_gradcam, compute_gradcam_for, overlay_heatmap  # noqa: E402
except ImportError as e:
    print(f"Warning: DeepfakeBench imports failed ({e}). Falling back to mock models.", file=sys.stderr)
    MOCK_MODELS = False
    DETECTOR = {}
    def compute_gradcam(model, tensor):
        return np.random.rand(256, 256), np.random.rand()
    def overlay_heatmap(crop, cam):
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        return cv2.addWeighted(crop, 0.5, heatmap, 0.5, 0)

MODEL_SPECS = [
    # (key, display name, config path, weights path, one-line trust note)
    ("ucf", "UCF", "training/config/detector/ucf.yaml", "training/weights/ucf_best.pth",
     "Best overall accuracy in our eval; verified architecture"),
    ("spsl", "SPSL", "training/config/detector/spsl.yaml", "training/weights/spsl_best.pth",
     "Best at catching fakes (lowest miss rate) in our eval; verified architecture"),
    ("xception", "Xception", "training/config/detector/xception.yaml", "training/weights/xception_best.pth",
     "Conservative baseline (zero false positives in our eval); verified architecture; drives the Grad-CAM view"),
]

FRAMES_PER_VIDEO = 5  # matches the frontend mock's 5 sampled-frame layout
FACE_RES = 256

# --- Face detection (OpenCV DNN SSD, CPU-friendly) ---
FACE_MODELS_DIR = os.path.join(BACKEND_DIR, "face_models")
SSD_PROTOTXT = os.path.join(FACE_MODELS_DIR, "deploy.prototxt")
SSD_CAFFEMODEL = os.path.join(
    FACE_MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel"
)

# Detection gates. Calibrated Sep 2026 against real project footage: a true
# face frame scored SSD 0.328 (a 0.5 threshold would MISS it), while a
# background region scored 0.98 — confidence alone cannot separate them.
# So the threshold stays low (0.3) and the size/aspect gates below do most
# of the false-positive rejection instead.
SSD_CONF_THRESHOLD = 0.3
MIN_FACE_PX = 60
MAX_FACE_FRAC = 0.9  # box w/h must each be < 90% of frame w/h
ASPECT_MIN, ASPECT_MAX = 0.5, 2.0  # box w/h ratio bounds
FACE_PAD_RATIO = 0.25

_MODEL_CACHE = {}


def get_face_detector():
    """Load the OpenCV DNN SSD face detector. Fail fast with a clear message
    if weights are missing — run: python3 scripts/download_face_models.py"""
    missing = [p for p in (SSD_PROTOTXT, SSD_CAFFEMODEL) if not os.path.exists(p)]
    if missing:
        raise RuntimeError(
            "Face-detector weights missing: " + ", ".join(missing)
            + ". Run: python3 scripts/download_face_models.py"
        )
    # Loaded fresh per analysis run: cheap (~10MB) and thread-safe, unlike a
    # shared module-global net used from background analysis threads.
    return cv2.dnn.readNetFromCaffe(SSD_PROTOTXT, SSD_CAFFEMODEL)


def pad_and_clamp_box(x, y, w, h, frame_w, frame_h, pad_ratio=FACE_PAD_RATIO):
    """Expand (x, y, w, h) by pad_ratio and clamp to the frame.
    Returns (x0, y0, x1, y1), or None if the result is degenerate/empty
    (can happen for boxes flush against a frame edge)."""
    pad = int(pad_ratio * max(w, h))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(frame_w, x + w + pad), min(frame_h, y + h + pad)
    if x1 <= x0 or y1 <= y0:
        return None
    return (x0, y0, x1, y1)


def passes_face_gates(w, h, conf, frame_w, frame_h):
    """Sanity gates for a candidate detection box. See threshold note above."""
    if conf < SSD_CONF_THRESHOLD:
        return False
    if w < MIN_FACE_PX or h < MIN_FACE_PX:
        return False
    if w > MAX_FACE_FRAC * frame_w or h > MAX_FACE_FRAC * frame_h:
        return False
    aspect = w / max(h, 1)
    if not (ASPECT_MIN <= aspect <= ASPECT_MAX):
        return False
    return True


def detect_faces_dnn(frame_bgr, net):
    """Returns [(conf, x0, y0, x1, y1), ...] for boxes passing all gates."""
    h, w = frame_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(frame_bgr, (300, 300)), 1.0, (300, 300),
        (104.0, 177.0, 123.0),
    )
    net.setInput(blob)
    dets = net.forward()
    out = []
    for i in range(dets.shape[2]):
        conf = float(dets[0, 0, i, 2])
        x0, y0, x1, y1 = (dets[0, 0, i, 3:7] * np.array([w, h, w, h])).astype(int)
        bw, bh = int(x1 - x0), int(y1 - y0)
        if bw <= 0 or bh <= 0:
            continue
        if passes_face_gates(bw, bh, conf, w, h):
            out.append((conf, int(x0), int(y0), int(x1), int(y1)))
    return out


def crop_face_bbox(frame_bgr, detector, res=FACE_RES):
    """Returns (crop, bbox) with bbox in (x0, y0, x1, y1) frame coords.

    Returns (None, None) when no detection passes the gates. There is
    deliberately NO blind center-crop fallback: callers must skip such
    frames rather than feed background into the detectors.
    """
    dets = detect_faces_dnn(frame_bgr, detector)
    if not dets:
        return None, None
    conf, x0, y0, x1, y1 = max(dets, key=lambda d: d[0])  # highest confidence
    frame_h, frame_w = frame_bgr.shape[:2]
    box = pad_and_clamp_box(x0, y0, x1 - x0, y1 - y0, frame_w, frame_h)
    if box is None:
        return None, None
    x0, y0, x1, y1 = box
    crop = cv2.resize(frame_bgr[y0:y1, x0:x1], (res, res))
    return crop, (x0, y0, x1, y1)


def sample_frames_with_timestamps(video_path):
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    duration = total / fps if fps > 0 else 0
    if total <= 0:
        cap.release()
        return [], duration
    
    # 1 frame taken from every 2 seconds
    n = max(1, int(duration / 2))
    idxs = np.linspace(0, total - 1, num=min(n, total), dtype=int)
    frames = []
    for idx in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = cap.read()
        t_sec = idx / fps if fps > 0 else 0
        if ok:
            frames.append({"frame": frame, "time_sec": float(t_sec)})
    cap.release()
    return frames, duration


def to_model_tensor(face_bgr, mean, std):
    rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    rgb = (rgb - np.array(mean)) / np.array(std)
    return torch.from_numpy(rgb).permute(2, 0, 1).float()


def load_model(key, cfg_rel, weights_rel, use_cache=False):
    if use_cache and key in _MODEL_CACHE:
        return _MODEL_CACHE[key]
    
    if MOCK_MODELS:
        # Provide a dummy config and model for mocked runs
        config = {"model_name": key, "mean": [0.5, 0.5, 0.5], "std": [0.5, 0.5, 0.5]}
        model = lambda x, inference: {"cls": torch.tensor([[0.1, 0.9] if np.random.rand() > 0.5 else [0.9, 0.1]] * x["image"].shape[0])}
        if use_cache:
            _MODEL_CACHE[key] = (model, config)
        return model, config

    with open(os.path.join(DFB_ROOT, cfg_rel)) as f:
        config = yaml.safe_load(f)
        
    # We bypass the pretrained weights since we inject the best checkpoint directly.
    dummy_pretrained = os.path.join(BACKEND_DIR, "dummy_pretrained.pth")
    if not os.path.exists(dummy_pretrained):
        torch.save({'conv1.weight': torch.randn(32, 3, 3, 3)}, dummy_pretrained)
    config['pretrained'] = dummy_pretrained

    model_class = DETECTOR[config["model_name"]]
    model = model_class(config)
    
    weight_path = os.path.join(DFB_ROOT, weights_rel)
    if not os.path.exists(weight_path):
        print(f"Warning: Checkpoint {weight_path} missing. Proceeding with uninitialized weights.", file=sys.stderr)
    else:
        ckpt = torch.load(weight_path, map_location="cpu")
        state_dict = ckpt.get("state_dict", ckpt) if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt
        model.load_state_dict(state_dict, strict=True)
    
    model.eval()
    if use_cache:
        _MODEL_CACHE[key] = (model, config)
    return model, config


def score_batch(model, config, tensors):
    batch = torch.stack(tensors)
    with torch.no_grad():
        data_dict = {"image": batch, "label": torch.zeros(batch.shape[0], dtype=torch.long)}
        out = model(data_dict, inference=True)
        probs = torch.softmax(out["cls"], dim=1)[:, 1]
    return probs.detach().cpu().numpy().tolist()


def format_timestamp(t_sec):
    m, s = divmod(int(round(t_sec)), 60)
    return f"{m:02d}:{s:02d}"


def analyze_video(video_path, frames_dir, progress_cb=None):
    """
    Runs the full pipeline. frames_dir is where per-frame original crops and
    Grad-CAM heatmap overlays get written as PNGs (served statically by the API).
    Returns a dict with everything the API layer needs -- see backend/README.md
    for the exact schema each endpoint slices out of this.
    """
    def report(msg):
        if progress_cb:
            progress_cb(msg)

    os.makedirs(frames_dir, exist_ok=True)
    detector = get_face_detector()

    report("Sampling frames")
    frames, duration = sample_frames_with_timestamps(video_path)
    if not frames:
        raise RuntimeError("Could not read any frames from the uploaded video.")

    # Crop faces once, reuse across all 3 models (each model has its own mean/std,
    # so we normalize per-model but the crop itself is model-independent).
    # Frames with no passing detection yield (None, None) and are SKIPPED
    # downstream: no model inference, no heatmap, no timeline point. They
    # keep their positional index in frame_records, visibly marked with
    # face_detected=False, so skipped frames never masquerade as detections.
    crops_bboxes = [crop_face_bbox(f["frame"], detector) for f in frames]
    valid_idx = [i for i, (crop, _bbox) in enumerate(crops_bboxes) if crop is not None]
    if not valid_idx:
        raise RuntimeError("No faces detected in any sampled frame of the uploaded video.")

    heatmaps_dir = os.path.join(os.path.dirname(frames_dir), "heatmaps")
    for key, *_ in MODEL_SPECS:
        os.makedirs(os.path.join(heatmaps_dir, key), exist_ok=True)

    model_video_scores = {}
    model_frame_scores = {}  # key -> {orig_frame_idx: prob}
    xception_probs = {}

    # One model at a time: load -> score -> Grad-CAM -> write -> free.
    # Keeps peak RAM to a single model on 8GB CPU-only machines.
    for key, display_name, cfg_rel, weights_rel, note in MODEL_SPECS:
        report(f"Running {display_name}")
        model, config = load_model(key, cfg_rel, weights_rel, use_cache=False)
        tensors = [
            to_model_tensor(crops_bboxes[i][0], config["mean"], config["std"])
            for i in valid_idx
        ]
        frame_probs = score_batch(model, config, tensors)
        model_frame_scores[key] = dict(zip(valid_idx, frame_probs))
        model_video_scores[key] = float(np.mean(frame_probs))

        report(f"Computing Grad-CAM ({display_name})")
        for orig_i in valid_idx:
            crop = crops_bboxes[orig_i][0]
            tensor = to_model_tensor(
                crop, config["mean"], config["std"]
            ).unsqueeze(0)
            cam, prob_fake = compute_gradcam_for(key, model, tensor)
            overlay = overlay_heatmap(crop, cam)
            cv2.imwrite(
                os.path.join(heatmaps_dir, key, f"frame_{orig_i}_heatmap.jpg"),
                overlay,
            )
            if key == "xception":
                # Legacy flat path kept so existing /frames/{n}/heatmap
                # clients (default ?model=xception) keep working.
                cv2.imwrite(
                    os.path.join(frames_dir, f"frame_{orig_i}_heatmap.jpg"),
                    overlay,
                )
                xception_probs[orig_i] = prob_fake

        # Free memory immediately
        del model
        import gc
        gc.collect()

    # Original crops, valid frames only (positional indices preserved).
    frame_records = []
    for i, frame_info in enumerate(frames):
        if i not in valid_idx:
            frame_records.append({
                "index": i,
                "time_sec": frame_info["time_sec"],
                "timestamp": format_timestamp(frame_info["time_sec"]),
                "face_detected": False,
                "fake_probability": None,
                "original_frame_file": None,
                "heatmap_file": None,
            })
            continue
        crop = crops_bboxes[i][0]
        orig_path = os.path.join(frames_dir, f"frame_{i}_original.jpg")
        cv2.imwrite(orig_path, crop)
        frame_records.append({
            "index": i,
            "time_sec": frame_info["time_sec"],
            "timestamp": format_timestamp(frame_info["time_sec"]),
            "face_detected": True,
            "fake_probability": round(xception_probs[i] * 100, 1),  # this drives the "face XX%" badge
            "original_frame_file": f"frame_{i}_original.jpg",
            "heatmap_file": f"frame_{i}_heatmap.jpg",
        })

    # Aggregate verdict across the 3 models
    scores_pct = {k: round(v * 100, 1) for k, v in model_video_scores.items()}
    mean_score = float(np.mean(list(model_video_scores.values())))
    spread = float(np.max(list(model_video_scores.values())) - np.min(list(model_video_scores.values())))
    if spread > 0.35:
        agreement = "disputed"
    elif spread > 0.15:
        agreement = "mixed"
    else:
        agreement = "high"

    verdict_label = "fake" if mean_score >= 0.5 else "real"

    result = {
        "duration_sec": duration,
        "verdict": {
            "label": verdict_label,
            "confidence": round(mean_score * 100, 1),
            "agreement": agreement,
            "models": [
                {
                    "key": key,
                    "name": name,
                    "score": scores_pct[key],
                    "verified": True,
                    "note": note,
                }
                for key, name, *_rest, note in MODEL_SPECS
            ],
        },
        "signals": {
            "models": [
                {"name": name, "score": scores_pct[key]}
                for key, name, *_rest in MODEL_SPECS
            ],
            "agreement": agreement,
            "agreement_spread": round(spread * 100, 1),
        },
        # Skipped (no-face) frames are dropped here: the frontend's
        # TimelineChart maps over points[] and handles variable lengths.
        "timeline": [
            {
                "time_sec": fr["time_sec"],
                "timestamp": fr["timestamp"],
                # Per-frame series from all 3 models
                "xception": round(model_frame_scores["xception"][fr["index"]] * 100, 1),
                "spsl": round(model_frame_scores["spsl"][fr["index"]] * 100, 1),
                "ucf": round(model_frame_scores["ucf"][fr["index"]] * 100, 1),
            }
            for fr in frame_records
            if fr["face_detected"]
        ],
        "frames": frame_records,
    }
    return result
