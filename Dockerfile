# DeepGuard backend — production image for Hugging Face Spaces (Docker).
# Build context is the REPO ROOT (Spaces builds from the Space repo root).
# Model checkpoints (*.pth, git-LFS) and face_models/ are baked in at build;
# REQUIRE_WEIGHTS=1 makes boot fail fast if they are absent.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ALLOW_ORIGINS="*" \
    REQUIRE_WEIGHTS=1

WORKDIR /app

COPY deepguard-backend/requirements.docker.txt ./requirements.docker.txt
RUN pip install --no-cache-dir -r requirements.docker.txt

COPY deepguard-backend/ /app/
COPY DeepfakeBench/ /DeepfakeBench/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7860

# Boot fetches git-ignored weights (WEIGHTS_REPO env) if absent, then serves.
# Single worker: jobs live in a process-local dict, so extra workers break
# status polling. No --reload in production.
CMD ["/entrypoint.sh"]
