"""Fetch the 3 DeepfakeBench checkpoints (~350MB, git-ignored) at deploy boot.

Source is a Hugging Face dataset repo (reliable, resumable) named by the
WEIGHTS_REPO env var, e.g. WEIGHTS_REPO=myuser/deepguard-weights:

    WEIGHTS_REPO=myuser/deepguard-weights python3 scripts/download_weights.py

Expected layout inside the repo: ucf_best.pth, spsl_best.pth,
xception_best.pth at the top level. Files land in
DeepfakeBench/training/weights/. Skips files already present.
Exits non-zero if any checkpoint is missing afterwards.

One-time manual step (web UI, no CLI needed): create the dataset repo on
huggingface.co and upload the three .pth files to it.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND_DIR)
WEIGHTS_DIR = os.path.join(REPO_ROOT, "DeepfakeBench", "training", "weights")

EXPECTED = ("ucf_best.pth", "spsl_best.pth", "xception_best.pth")


def main():
    repo = os.environ.get("WEIGHTS_REPO", "").strip()
    if not repo:
        print(
            "WEIGHTS_REPO is not set. Create a Hugging Face dataset repo, "
            "upload ucf_best.pth / spsl_best.pth / xception_best.pth to it, "
            "then set WEIGHTS_REPO=<user>/<repo> and re-run.",
            file=sys.stderr,
        )
        return 1

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    missing = [f for f in EXPECTED if not os.path.exists(os.path.join(WEIGHTS_DIR, f))]
    if not missing:
        print("Checkpoints already present, skipping download.")
        return 0

    from huggingface_hub import snapshot_download

    print(f"Downloading {missing} from Hugging Face repo '{repo}' ...")
    snapshot_download(
        repo_id=repo,
        repo_type="dataset",
        local_dir=WEIGHTS_DIR,
        allow_patterns=list(EXPECTED),
    )
    still_missing = [f for f in EXPECTED if not os.path.exists(os.path.join(WEIGHTS_DIR, f))]
    if still_missing:
        print(f"FAILED: still missing after download: {still_missing}", file=sys.stderr)
        return 1
    print("All checkpoints present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
