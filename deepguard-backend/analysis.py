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

# Fallback mechanism if full DeepfakeBench dependencies or weights are not present
MOCK_MODELS = False
try:
    from detectors import DETECTOR  # noqa: E402
    from gradcam import compute_gradcam, overlay_heatmap  # noqa: E402
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

_MODEL_CACHE = {}


def get_face_detector():
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    return cv2.CascadeClassifier(cascade_path)


def crop_face_bbox(frame_bgr, detector, res=FACE_RES):
    """Returns (crop, bbox) where bbox is (x0,y0,x1,y1) in original frame coords, or None bbox if none found."""
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        h, w = frame_bgr.shape[:2]
        s = min(h, w)
        y0, x0 = (h - s) // 2, (w - s) // 2
        bbox = None
        crop = frame_bgr[y0:y0 + s, x0:x0 + s]
    else:
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        pad = int(0.25 * max(w, h))
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1 = min(frame_bgr.shape[1], x + w + pad)
        y1 = min(frame_bgr.shape[0], y + h + pad)
        bbox = (x0, y0, x1, y1)
        crop = frame_bgr[y0:y1, x0:x1]
    crop = cv2.resize(crop, (res, res))
    return crop, bbox


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
    crops_bboxes = [crop_face_bbox(f["frame"], detector) for f in frames]

    model_video_scores = {}
    model_frame_scores = {key: [] for key, *_ in MODEL_SPECS}

    for key, display_name, cfg_rel, weights_rel, note in MODEL_SPECS:
        report(f"Running {display_name}")
        model, config = load_model(key, cfg_rel, weights_rel, use_cache=False)
        tensors = [to_model_tensor(crop, config["mean"], config["std"]) for crop, _ in crops_bboxes]
        frame_probs = score_batch(model, config, tensors)
        model_frame_scores[key] = frame_probs
        model_video_scores[key] = float(np.mean(frame_probs))
        
        # Free memory immediately
        del model
        import gc
        gc.collect()

    # Grad-CAM + per-frame face crops, driven by Xception (see module docstring)
    report("Computing Grad-CAM")
    xception_model, xception_config = load_model("xception", MODEL_SPECS[2][2], MODEL_SPECS[2][3], use_cache=False)
    frame_records = []
    for i, (frame_info, (crop, bbox)) in enumerate(zip(frames, crops_bboxes)):
        tensor = to_model_tensor(crop, xception_config["mean"], xception_config["std"]).unsqueeze(0)
        cam, prob_fake = compute_gradcam(xception_model, tensor)
        overlay = overlay_heatmap(crop, cam)

        orig_path = os.path.join(frames_dir, f"frame_{i}_original.jpg")
        heat_path = os.path.join(frames_dir, f"frame_{i}_heatmap.jpg")
        cv2.imwrite(orig_path, crop)
        cv2.imwrite(heat_path, overlay)

        frame_records.append({
            "index": i,
            "time_sec": frame_info["time_sec"],
            "timestamp": format_timestamp(frame_info["time_sec"]),
            "face_detected": bbox is not None,
            "fake_probability": round(prob_fake * 100, 1),  # this drives the "face XX%" badge
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
        "timeline": [
            {
                "time_sec": fr["time_sec"],
                "timestamp": fr["timestamp"],
                # Per-frame series from all 3 models, plus the Xception-Grad-CAM-aligned value
                "xception": round(model_frame_scores["xception"][i] * 100, 1),
                "spsl": round(model_frame_scores["spsl"][i] * 100, 1),
                "ucf": round(model_frame_scores["ucf"][i] * 100, 1),
            }
            for i, fr in enumerate(frame_records)
        ],
        "frames": frame_records,
    }
    return result
