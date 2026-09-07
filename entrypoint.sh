#!/bin/sh
# Production entrypoint (Hugging Face Spaces Docker).
# Fetches git-ignored weights on boot (skipped when already present),
# then starts the API. Single worker: jobs live in a process-local dict.
set -e
cd /app
python3 scripts/download_weights.py
python3 scripts/download_face_models.py
exec uvicorn main:app --host 0.0.0.0 --port 7860 --workers 1
