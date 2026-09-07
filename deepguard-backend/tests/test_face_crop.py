"""Unit tests for the face-box padding/clamp and detection gates.

Run from deepguard-backend/:  python3 tests/test_face_crop.py
Exit code is non-zero on the first failure. No pytest dependency, no model
weights, no video files needed — pure geometry checks.

The key regression under test: a detected box flush against a frame edge
must never produce a degenerate (empty) crop after the 25% padding clamp.
Real-world anchor: SSD box (1720, 214, 193, 284) in a 1920x1080 project
frame, whose right edge sits 7px from the frame border.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis import pad_and_clamp_box, passes_face_gates  # noqa: E402

PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("PASS " if cond else "FAIL ") + name)


# --- pad_and_clamp_box ---

# Real edge box from project footage: right edge 7px from a 1920px border.
box = pad_and_clamp_box(1720, 214, 193, 284, 1920, 1080)
check("edge box survives padding clamp", box is not None)
if box:
    x0, y0, x1, y1 = box
    check("edge box non-empty", x1 > x0 and y1 > y0)
    check("edge box clamped to frame", 0 <= x0 and y0 >= 0 and x1 <= 1920 and y1 <= 1080)
    check("edge box keeps detection inside", x0 <= 1720 and x1 >= 1720 + 193)

# Top-left corner box (pad = 0.25 * max(100, 120) = 30).
box = pad_and_clamp_box(0, 0, 100, 120, 640, 480)
check("corner box survives", box == (0, 0, 130, 150))

# Centered box: symmetric padding.
box = pad_and_clamp_box(270, 180, 100, 120, 640, 480)
check("center box padded symmetrically", box == (240, 150, 400, 330))

# Box covering the whole frame: clamps to full frame, still valid.
box = pad_and_clamp_box(0, 0, 640, 480, 640, 480)
check("full-frame box clamps to frame", box == (0, 0, 640, 480))

# Zero-area input is rejected instead of producing an empty crop.
check("zero-area box rejected", pad_and_clamp_box(100, 100, 0, 0, 640, 480) is None)

# --- passes_face_gates ---

# Real project calibration points (SSD confidences on actual footage):
# 0.992 true face, 0.328 true face (angle), 0.981 edge region.
check("high-conf face passes", passes_face_gates(134, 185, 0.992, 1920, 1080))
check("low-conf true face passes at 0.3 threshold",
      passes_face_gates(79, 117, 0.328, 1920, 1080))
check("edge region passes gates (size/aspect are face-plausible)",
      passes_face_gates(193, 284, 0.981, 1920, 1080))
check("sub-threshold blob rejected", not passes_face_gates(200, 200, 0.29, 1920, 1080))
check("tiny box rejected", not passes_face_gates(30, 30, 0.9, 1920, 1080))
check("huge box rejected", not passes_face_gates(1800, 1000, 0.9, 1920, 1080))
check("sliver aspect rejected", not passes_face_gates(400, 100, 0.9, 1920, 1080))
check("tall sliver aspect rejected", not passes_face_gates(100, 400, 0.9, 1920, 1080))

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
