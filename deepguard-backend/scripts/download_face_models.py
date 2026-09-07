"""Download the OpenCV DNN face-detector weights (res10 SSD, ~10MB).

The caffemodel + prototxt are git-ignored build artifacts (see repo
.gitignore). Run once per fresh checkout:

    python3 scripts/download_face_models.py

Exits non-zero if a download or checksum check fails.
"""
import hashlib
import os
import sys
import urllib.request

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BACKEND_DIR, "face_models")

FILES = {
    "deploy.prototxt": (
        "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
        "dcd661dc48fc9de0a341db1f666a2164ea63a67265c7f779bc12d6b3f2fa67e9",
    ),
    "res10_300x300_ssd_iter_140000.caffemodel": (
        "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
        "2a56a11a57a4a295956b0660b4a3d76bbdca2206c4961cea8efe7d95c7cb2f2d",
    ),
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    failed = False
    for name, (url, digest) in FILES.items():
        dest = os.path.join(OUT_DIR, name)
        if os.path.exists(dest) and sha256(dest) == digest:
            print(f"OK (cached): {name}")
            continue
        print(f"Downloading {name} ...")
        try:
            urllib.request.urlretrieve(url, dest)
        except Exception as e:
            print(f"FAILED to download {name}: {e}", file=sys.stderr)
            failed = True
            continue
        if sha256(dest) != digest:
            print(f"FAILED checksum for {name}", file=sys.stderr)
            failed = True
        else:
            print(f"OK: {name}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
