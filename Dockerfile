# DeepGuard backend — production image (generic Docker host / VPS).
# Build context is the REPO ROOT.
# Model checkpoints (*.pth) are NOT baked in: mount them at /weights
# (see docker-compose.yml) or set WEIGHTS_DIR to their location.
# REQUIRE_WEIGHTS=1 makes boot fail fast if they are absent.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ALLOW_ORIGINS="*" \
    REQUIRE_WEIGHTS=1 \
    WEIGHTS_DIR=/weights

WORKDIR /app

COPY deepguard-backend/requirements.docker.txt ./requirements.docker.txt
RUN pip install --no-cache-dir -r requirements.docker.txt

COPY deepguard-backend/ /app/
COPY DeepfakeBench/ /DeepfakeBench/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Face-detector weights (~10MB, checksummed). No-op if already present.
RUN python3 scripts/download_face_models.py

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python3 -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=8).status == 200 else 1)"

# Single worker: jobs live in a process-local dict, so extra workers break
# status polling. No --reload in production.
CMD ["/entrypoint.sh"]
