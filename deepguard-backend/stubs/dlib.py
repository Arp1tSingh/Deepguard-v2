"""Minimal dlib stand-in for DeepGuard inference.

The real dlib package has no prebuilt wheel for Python 3.14 (it fails to
compile without Python headers), and installing it is unnecessary: dlib is
only referenced by DeepfakeBench's *training-time* dataset code
(e.g. face blending helpers), never by the inference path in analysis.py.

This stub provides the two attributes touched during module import so that
`from detectors import DETECTOR` succeeds. It must never be relied upon for
real face detection — analysis.py uses OpenCV Haar cascades instead.
"""


class _Det:
    def __call__(self, *args, **kwargs):
        return []


def get_frontal_face_detector():
    return _Det()


def shape_predictor(*args, **kwargs):
    return None
