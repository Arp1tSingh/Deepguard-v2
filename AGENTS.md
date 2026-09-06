# AGENTS.md — DeepGuard contributor guide

For AI coding agents and human contributors. `README.md` explains the product
and how to install it; this file explains how to *work in* the repo without
breaking it.

## What this repo is

Three parts, two runtimes:

- `deepguard-frontend/` — Next.js 16 + React 19 + Tailwind v4 dashboard.
  Upload → staged progress → verdict, evidence inspector (original vs. Grad-CAM
  wipe), forensic signals, 3-line temporal chart, PDF export.
- `deepguard-backend/` — FastAPI service. Runs UCF / SPSL / Xception on CPU,
  computes Xception Grad-CAM, serves verdict/evidence/signals/timeline/export.
- `DeepfakeBench/` — vendored upstream detectors. **Read-only dependency, not
  our code.** See "Why is DeepfakeBench vendored" in `README.md`. The one
  exception is the documented `lsda_dataset.py` CUDA guard patch (crashes on
  GPU-less machines without it) — preserve it.

## Running it locally

Backend (`deepguard-backend/`, port 8000):

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# place ucf_best.pth / spsl_best.pth / xception_best.pth in
# ../DeepfakeBench/training/weights/  (git-ignored, never commit)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (`deepguard-frontend/`, port 3000):

```bash
npm install
cp .env.example .env.local   # must contain NEXT_PUBLIC_DEEPGUARD_API_URL
npm run dev
```

`NEXT_PUBLIC_*` vars are inlined at **build time** — restart `npm run dev`
after changing `.env.local`. A build baked with the wrong URL fails in the
browser, not at build time.

## Backend rules

- Key files: `main.py` (all 10 endpoints + in-memory `JOBS` registry),
  `analysis.py` (upload → sample → 3 models → Grad-CAM pipeline),
  `gradcam.py`, `pdf_export.py`, `stubs/` (see below).
- `stubs/` (`dlib.py`, `imgaug/`) exists because real `dlib` won't compile on
  Python 3.14 and real `imgaug` breaks on numpy 2 / pulls opencv 5.x.
  Both are training-time-only deps; `analysis.py` prefers real installs and
  falls back to stubs. Do not add either to `requirements.txt`.
- `opencv-python-headless` must stay on 4.x (`<5.0.0`): v5 removed
  `CascadeClassifier`, which `analysis.py` uses for face detection.
- Run exactly **one** uvicorn worker, never `--reload` in prod: jobs live in
  a process-local dict, so extra workers break status polling. Disk fallback
  (`storage/{id}/result.json`) only reconstructs *completed* jobs.
- `build_pdf_report` is synchronous CPU work inside an `async` handler; keep
  long/blocking work in threads, never add more blocking calls to handlers.
- Never commit: `*.pth` weights, `venv/`, `storage/`, `dummy_pretrained.pth`,
  `__pycache__/`.

## Frontend rules

- `src/lib/deepguard-api.ts` is the **only** API surface. Never hardcode a
  host — always go through `NEXT_PUBLIC_DEEPGUARD_API_URL`. Backend media
  URLs are relative paths; the client prefixes them.
- `DeepGuardProvider` owns the upload → poll (2.5s) → parallel fetch state
  machine. Re-uploads must fully reset all section state (no stale data).
  Cancel polling on unmount / new upload.
- `src/lib/theme.ts` owns model color identity (`MODEL_COLORS`,
  `MODEL_NAMES`). Never color models by score thresholds.
- `StatusPill` is the only badge pattern (verdict, agreement, Verified tags).
  No ad-hoc badges.
- Design tokens live in `globals.css` `:root`: `--accent` (brand/buttons/
  focus only), `--fake`, `--real`, `--disputed` (semantic, nowhere else).
  Do not introduce new hues. No gradients, glows, or colored dots — the
  single exception is the confidence ring in `CompactVerdict`.
- `font-mono` (IBM Plex Mono) on **every** number: scores, percentages,
  timestamps. Headings use Space Grotesk, body uses Inter.
- `confidence` (mean P(fake)) and `agreement` (high/mixed/disputed) answer
  different questions — display both, never collapse them into one number.
- A frame's `face_confidence` is Xception's per-frame P(fake), **not**
  face-detection confidence — label it "Fake Prob".
- Export downloads the backend-generated PDF via blob + temp `<a download>`.
  Never navigate to the URL (loses SPA state). Surface fetch errors in the UI,
  never `console.error`-only.

## Backend ↔ frontend contract

| Method | Endpoint | Returns |
| ------ | -------- | ------- |
| POST | `/api/upload` (multipart `file`) | `{video_id, status}` |
| GET | `/api/videos/{id}/status` | `{status, progress, error?}` |
| GET | `/api/videos/{id}/verdict` | `{label, confidence, agreement, models[]}` |
| GET | `/api/videos/{id}/evidence` | `{original_video_url, frames[]}` |
| GET | `/api/videos/{id}/signals` | `{models[], agreement, agreement_spread}` |
| GET | `/api/videos/{id}/timeline` | `{duration_sec, points[]}` (`xception`/`spsl`/`ucf` per point) |
| GET | `/api/videos/{id}/export` | PDF download |
| GET | `/api/videos/{id}/original`, `/frames/{n}/original`, `/frames/{n}/heatmap` | raw media |

Contract changes must stay additive (new fields/endpoints OK; never rename
existing ones) — the other side is often mid-development.

## Verify before finishing

- Frontend: `npm run lint && npm run build` (both must pass clean).
- Backend: boot uvicorn and hit `/api/health` → `{"status":"ok"}` with no
  tracebacks and no mock-model fallback warning (unless weights absent).
- Commits: short imperative messages; push to `main` when done.

## Gotchas

- Torch's `torch.jit.script` FutureWarning on Python 3.14 is benign noise.
- Analysis is CPU-bound (25–30s+); the 2.5s poll loop doubles as a
  keep-alive on sleep-on-idle hosts.
- `DeepfakeBench/training/weights/` is git-ignored — fresh clones need the
  weights dropped in before real inference works.
- CORS is wide-open and there is no auth — fine for local dev, must be
  tightened before any public hosting (see README "Known limitations").
