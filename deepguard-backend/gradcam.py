"""
Grad-CAM for the DeepfakeBench Xception detector.

Uses the backbone's own features()/classifier() split (already exposed by
xception_detector.py): features() returns the last conv feature map
(post conv4/bn4, pre-pool) with spatial dims intact, and classifier() applies
ReLU + global-avg-pool + linear on top. Standard Grad-CAM: backprop the
"fake" logit into that feature map, weight channels by their average
gradient, ReLU, and resize to the input resolution as a heatmap.
"""
import cv2
import numpy as np
import torch
import torch.nn.functional as F


def compute_gradcam(model, image_tensor, target_class=1):
    """
    model: an XceptionDetector instance (has .features() / .classifier())
    image_tensor: [1, C, H, W] preprocessed tensor, requires no grad itself
    target_class: 1 = "fake" logit (matches training label convention)
    Returns: cam as a [H, W] numpy array in [0, 1], and the predicted prob(fake).
    """
    model.eval()
    image_tensor = image_tensor.clone().requires_grad_(False)

    features = model.features({"image": image_tensor})  # [1, C, h, w], spatial map
    features.retain_grad()
    logits = model.classifier(features)  # [1, 2]
    prob_fake = torch.softmax(logits, dim=1)[0, 1].item()

    model.zero_grad()
    score = logits[0, target_class]
    score.backward()

    grads = features.grad  # [1, C, h, w]
    weights = grads.mean(dim=(2, 3), keepdim=True)  # [1, C, 1, 1]
    cam = F.relu((weights * features).sum(dim=1))  # [1, h, w]
    cam = cam[0].detach().numpy()

    # normalize to [0, 1]
    cam -= cam.min()
    if cam.max() > 0:
        cam /= cam.max()

    h, w = image_tensor.shape[2], image_tensor.shape[3]
    cam = cv2.resize(cam, (w, h))
    return cam, prob_fake


def overlay_heatmap(face_crop_bgr, cam, alpha=0.45):
    """Overlay a [0,1] cam array onto a BGR face crop image (same resolution)."""
    heatmap = np.uint8(255 * cam)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(heatmap, alpha, face_crop_bgr, 1 - alpha, 0)
    return overlay
