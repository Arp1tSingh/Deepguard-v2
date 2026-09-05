# Compatibility stubs (inference-safe)

`dlib` and `imgaug` are intentionally **not** in `requirements.txt`:

- `dlib` has no prebuilt wheel for Python 3.14 and fails to compile without
  Python headers.
- `imgaug` is incompatible with numpy 2 (uses the removed `np.sctypes`) and
  pulls in opencv 5.x, which removed the `CascadeClassifier` that
  `analysis.py` relies on for face detection.

Both packages are only referenced by DeepfakeBench's **training-time** code
(dataset blending / augmentation helpers). The inference path in
`analysis.py` never calls them — it only needs their imports to succeed when
`training/detectors` and `training/dataset` modules load.

`analysis.py` therefore tries the real packages first and falls back to these
stubs (this directory is prepended to `sys.path`) when they are unavailable
or broken. If you install working real versions of both packages, they take
precedence automatically and the stubs are ignored.
