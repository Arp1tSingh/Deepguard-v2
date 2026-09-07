# DeepGuard — AI-Powered Deepfake Detection

DeepGuard is a full-stack deepfake detection platform. Upload a video and get a
forensic verdict from **three independently-verified detectors** (UCF, SPSL,
Xception from [DeepfakeBench](https://github.com/SCLBD/DeepfakeBench)), plus
**Grad-CAM heatmap overlays** showing which face regions drove the prediction,
per-model signal breakdowns, a temporal confidence timeline, and a downloadable
PDF report.

- **Frontend** (`deepguard-frontend/`): Next.js 16 + React 19 + Tailwind CSS v4
  dashboard with verdict summary, evidence inspector (original vs. Grad-CAM
  wipe slider), forensic signals, temporal analysis chart, and PDF export.
- **Backend** (`deepguard-backend/`): FastAPI service that runs the 3 models on
  CPU, computes Grad-CAM on Xception, and serves verdict/evidence/signals/
  timeline/export endpoints.
- **Models** (`DeepfakeBench/`): vendored DeepfakeBench training code used for
  inference (checkpoints are **not** committed — see setup below).

---

## Architecture

```
Browser (:3000) ──REST──> FastAPI (:8000) ──> UCF / SPSL / Xception (CPU)
     │                          │
     │                          ├── Grad-CAM (Xception) → heatmap JPEGs
     │                          └── storage/{video_id}/ (video, frames, result.json, report.pdf)
     └── polls /status every 2.5s, then fetches verdict/evidence/signals/timeline
```

Analysis is CPU-bound and takes ~25–30s per video on a decent machine
(2–5 min on low-end hardware). The UI is built around that latency with real
stage labels (`Sampling frames → Running UCF → Running SPSL → Running
Xception → Computing Grad-CAM`), not a fake spinner.

---

## Prerequisites

| Tool | Version |
| ---- | ------- |
| Python | 3.10+ (3.14 works) |
| Node.js | 18+ |
| npm | 9+ |
| git | any recent |

No GPU required — everything runs on CPU.

---

## 1. Clone the repo

```bash
git clone https://github.com/Arp1tSingh/Deepguard-v2.git
cd Deepguard-v2   # (folder is named "deepguard" locally)
```

---

## 2. Backend setup

```bash
cd deepguard-backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies (frozen set — includes everything the DeepfakeBench
# models need; dlib/imgaug are intentionally excluded, see stubs/README.md)
pip install -r requirements.txt
```

### 2a. Model checkpoints (required for real inference)

The `.pth` weights are git-ignored (too large for GitHub). Download the three
checkpoints and place them here:

```
DeepfakeBench/training/weights/
├── ucf_best.pth        (~188 MB)
├── spsl_best.pth       (~88 MB)
└── xception_best.pth   (~88 MB)
```

Links to these files are in the official DeepfakeBench README/releases.
Without them the backend still boots but falls back to mock scores.

> **Low-end machines (8 GB RAM, no GPU):** install the CPU-only PyTorch to
> save ~2 GB of CUDA bundles, and keep videos short. The backend loads one
> model at a time and frees it immediately to stay within memory limits.

### 2b. Run the backend

```bash
# from deepguard-backend/, with venv activated
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify: http://localhost:8000/api/health → `{"status":"ok"}`
API docs: http://localhost:8000/docs

---

## 3. Frontend setup

```bash
cd deepguard-frontend

npm install

# Point the frontend at the backend
cp .env.example .env.local
# .env.local should contain:
# NEXT_PUBLIC_DEEPGUARD_API_URL=http://localhost:8000

npm run dev
```

Open http://localhost:3000, drop in an MP4/WebM/MOV (max 500 MB), and watch
the verdict appear after analysis completes.

Other commands:

```bash
npm run build   # production build
npm run start   # serve production build
npm run lint    # eslint
```

> `NEXT_PUBLIC_*` vars are inlined at **build time** — restart `npm run dev`
> after changing `.env.local`.

---

## 4. Usage

1. **Upload** a video via drag & drop (or click to browse).
2. Wait through the staged progress indicator (~25–30s).
3. The page auto-scrolls to the result. A compact **verdict card**
   (FAKE/REAL + confidence ring) appears next to the dropzone.
4. Inspect **Evidence** (original vs. Grad-CAM wipe slider),
   **Forensic Signals** (per-model bars + agreement), and the
   **Temporal Analysis** 3-line chart (UCF/SPSL/Xception over time).
5. **Export Report** downloads the backend-generated PDF (no client-side
   PDF generation — the SPA state is preserved).

Re-uploading a new video fully resets all sections.

---

## API contract (backend → frontend)

Base URL: `NEXT_PUBLIC_DEEPGUARD_API_URL` (default `http://localhost:8000`).

| Method | Endpoint | Returns |
| ------ | -------- | ------- |
| POST | `/api/upload` (multipart `file`) | `{video_id, status}` |
| GET | `/api/videos/{id}/status` | `{status, progress, error?}` |
| GET | `/api/videos/{id}/verdict` | `{label, confidence, agreement, models[]}` |
| GET | `/api/videos/{id}/evidence` | `{original_video_url, frames[]}` |
| GET | `/api/videos/{id}/signals` | `{models[], agreement, agreement_spread}` |
| GET | `/api/videos/{id}/timeline` | `{duration_sec, points[]}` |
| GET | `/api/videos/{id}/export` | PDF file download |
| GET | `/api/videos/{id}/original` | raw video |
| GET | `/api/videos/{id}/frames/{n}/original` | frame JPEG |
| GET | `/api/videos/{id}/frames/{n}/heatmap` | Grad-CAM JPEG |

Notes:

- `agreement` (`high`/`mixed`/`disputed`) is **distinct** from `confidence` —
  the UI shows both separately on purpose.
- A frame's `face_confidence` is Xception's per-frame P(fake), **not**
  face-detection confidence — the UI labels it "Fake Prob".
- All media URLs from the backend are relative paths; the frontend prefixes
  them with the API base URL.

---

## Project structure

```
deepguard/
├── README.md                  ← you are here
├── DeepfakeBench/             ← vendored detector code (weights git-ignored)
│   └── training/weights/      ← place ucf/spsl/xception .pth here (local only)
├── deepguard-backend/
│   ├── main.py                ← FastAPI app + all endpoints
│   ├── analysis.py            ← 3-model pipeline + Grad-CAM frame extraction
│   ├── gradcam.py             ← Xception Grad-CAM
│   ├── pdf_export.py          ← server-side PDF report
│   ├── requirements.txt
│   └── storage/               ← per-video results (git-ignored, local only)
└── deepguard-frontend/
    ├── src/app/
    │   ├── page.tsx           ← hero + verdict + dashboard sections
    │   ├── components/        ← Dropzone, ReportPanel, EvidenceInspector,
    │   │                        SignalBreakdown, TimelineChart, ExportReport…
    │   └── lib/               ← deepguard-api.ts (typed API client), theme.ts
    ├── .env.example
    └── package.json
```

---

## Why is DeepfakeBench vendored inside this repo?

`DeepfakeBench/` is the upstream open-source project
([SCLBD/DeepfakeBench](https://github.com/SCLBD/DeepfakeBench)) that provides
the UCF, SPSL, and Xception detector implementations. It is copied into this
repo (rather than referenced as a submodule or package) for two reasons:

1. **The backend imports it directly.** `deepguard-backend/analysis.py` adds
   `DeepfakeBench/training` to `sys.path` and loads the detector classes,
   backbone networks, YAML configs, and `.pth` checkpoints from there. Without
   this folder, the backend boots but falls back to mock scores.
2. **It carries local patches.** At least one upstream file is patched for
   this project — `training/dataset/lsda_dataset.py` calls
   `torch.cuda.get_device_name()` at import time, which crashes on machines
   without an NVIDIA GPU. The vendored copy guards that call so CPU-only
   setups work. A fresh upstream clone would not include this fix.

Notes:

- Only a slice of it is actually used (`detectors/`, `networks/`, `loss/`,
  `metrics/`, three YAML configs). The `analysis/`, `preprocessing/`,
  `datasets/` folders and training scripts are unused by DeepGuard.
- The heavy part — the three `.pth` checkpoints (~350 MB) — is **git-ignored**
  and lives only on your machine under `DeepfakeBench/training/weights/`.
  What's committed is source code (~5 MB).

## Known limitations

- **CPU-only inference** — slow on low-end hardware by design; GPU support is
  a future improvement.
- **Face detection** uses OpenCV's DNN SSD detector (`res10`, CPU-friendly),
  gated by confidence (≥ 0.3) plus min/max-size and aspect-ratio checks — far
  more robust than the old Haar cascades to angle, lighting, and partial
  occlusion, without needing dlib. Frames with no passing detection are
  skipped (no model inference, no heatmap, no timeline point) and surface in
  the UI as "No face detected" instead of silently analyzing background.
- **Grad-CAM is per-model** (UCF / SPSL / Xception), selectable in the
  Evidence Inspector. SPSL's heatmap visualizes its RGB branch only, not the
  frequency phase-spectrum branch — partial explainability, not the full
  story. UCF's heatmap hooks the forgery encoder via the shared-forgery
  head and is likewise approximate.
- **Single-process job registry** persisted to `storage/` — fine for local
  use, not production traffic (no queue, retry, or cleanup).
- **CORS is wide-open** (`allow_origins=["*"]`) and there is **no auth** —
  tighten both before exposing the backend publicly.
- Per-model accuracy notes come from a small 20-clip eval — treat as
  indicative, not a guarantee.
