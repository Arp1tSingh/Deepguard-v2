"""Minimal imgaug stand-in for DeepGuard inference.

The real imgaug package is incompatible with numpy 2 (it uses the removed
np.sctypes) and depends on opencv 5.x, which removed the CascadeClassifier
that analysis.py needs. imgaug is only referenced by DeepfakeBench's
*training-time* augmentation code, never by inference, so an empty package
plus an empty `augmenters` submodule is sufficient for imports to succeed.
"""
