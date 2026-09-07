"""
Grad-CAM for the DeepfakeBench detectors (Xception, SPSL, UCF).

Standard Grad-CAM: backprop the "fake" logit into the last spatial feature
map, weight channels by their average gradient, ReLU, and resize to the input
resolution as a heatmap.

Per-model target layers (verified against the vendored sources, not assumed):
- xception: detector.features() -> detector.classifier()
  (backbone post-conv4/bn4 spatial map; see training/networks/xception.py).
- spsl: detector.features(image, phase_fea) -> detector.classifier().
  NOTE: SPSL fuses an RGB branch with a frequency phase-spectrum branch
  (see phase_without_amplitude in spsl_detector.py). This CAM backprops
  through the fused path but the visualized spatial map is the RGB
  backbone's — i.e. RGB-branch-only, partial explainability. Do not present
  it as explaining the phase branch.
- ucf: encoder_f.features(image) -> classifier() -> head_sha(f_share).
  NOTE: UCF runs dual encoders (forgery + content) plus disentanglement
  blocks. This CAM hooks the *forgery* encoder output and backprops the
  shared-forgery head (the same head whose logits drive inference
  `pred_dict['cls']`). Approximate, but faithful to the inference decision.
"""
import cv2
import numpy as np
import sys
import torch
import torch.nn.functional as F


def _normalize_cam(cam, model_key):
    cam = cam - cam.min()
    if cam.max() > 0:
        cam /= cam.max()
    if not np.isfinite(cam).all() or cam.max() <= 0:
        print(
            f"Warning: Grad-CAM output degenerate (all-zero or NaN) for "
            f"model '{model_key}'. A blank heatmap will be written.",
            file=sys.stderr,
        )
    return cam


def compute_gradcam_for(model_key, model, image_tensor, target_class=1):
    """
    model_key: "xception" | "spsl" | "ucf".
    image_tensor: [1, C, H, W] preprocessed tensor.
    target_class: 1 = "fake" logit (matches training label convention).
    Returns: cam as a [H, W] numpy array in [0, 1], and predicted prob(fake).
    """
    model.eval()
    image_tensor = image_tensor.clone().requires_grad_(False)

    if model_key == "spsl":
        phase_fea = model.phase_without_amplitude(image_tensor)
        features = model.features({"image": image_tensor}, phase_fea)
        logits = model.classifier(features)
    elif model_key == "ucf":
        features = model.encoder_f.features(image_tensor)
        _, f_share = model.classifier(features)
        logits, _ = model.head_sha(f_share)
    else:  # xception
        features = model.features({"image": image_tensor})
        logits = model.classifier(features)

    # Non-leaf tensor: required so .grad populates on backward().
    features.retain_grad()

    prob_fake = torch.softmax(logits, dim=1)[0, 1].item()

    model.zero_grad()
    score = logits[0, target_class]
    score.backward()

    grads = features.grad  # [1, C, h, w]
    weights = grads.mean(dim=(2, 3), keepdim=True)  # [1, C, 1, 1]
    cam = F.relu((weights * features).sum(dim=1))  # [1, h, w]
    cam = cam[0].detach().numpy()

    cam = _normalize_cam(cam, model_key)

    h, w = image_tensor.shape[2], image_tensor.shape[3]
    cam = cv2.resize(cam, (w, h))
    return cam, prob_fake


def compute_gradcam(model, image_tensor, target_class=1):
    """Legacy Xception-only entry point. Prefer compute_gradcam_for."""
    return compute_gradcam_for("xception", model, image_tensor, target_class)


def overlay_heatmap(face_crop_bgr, cam, alpha=0.45):
    """Overlay a [0,1] cam array onto a BGR face crop image.

    The cam is resized to the crop if shapes differ, so overlays stay
    aligned when crop dimensions vary frame-to-frame.
    """
    if cam.shape[:2] != face_crop_bgr.shape[:2]:
        cam = cv2.resize(cam, (face_crop_bgr.shape[1], face_crop_bgr.shape[0]))
    heatmap = np.uint8(255 * np.clip(cam, 0, 1))
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(heatmap, alpha, face_crop_bgr, 1 - alpha, 0)
    return overlay
