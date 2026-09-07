#!/bin/sh
# Production entrypoint (generic Docker host / VPS).
# Model checkpoints come from the WEIGHTS_DIR bind mount (see
# docker-compose.yml); face_models/ were fetched at image build time.
# Single worker: jobs live in a process-local dict.
set -e
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
