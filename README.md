# DeepGuard — AI-Powered Deepfake Detection

Upload a video, get a forensic verdict from **three independent detectors**
(UCF, SPSL, Xception from
[DeepfakeBench](https://github.com/SCLBD/DeepfakeBench)), plus **Grad-CAM
heatmap overlays**, per-model signal breakdowns, a temporal confidence
timeline, and a downloadable PDF report.

```
Browser (:3000) ──REST──> FastAPI (:8000) ──> UCF / SPSL / Xception (CPU)
     │                          │
     │                          ├── Grad-CAM (Xception) → heatmap JPEGs
     │                          └── storage/{video_id}/ (video, frames, result.json, report.pdf)
     └── polls /status every 2.5s, then fetches verdict/evidence/signals/timeline
```

Analysis is CPU-bound (~25–30s per video on a decent machine, longer on
low-end hardware). The UI shows real stage labels
(`Sampling frames → Running UCF → Running SPSL → Running
Xception → Computing Grad-CAM`), not a fake spinner.

> This guide is written for **Windows** (PowerShell). macOS/Linux commands
> differ only where noted.

---

## 1. What you need

| Tool | Version | Windows notes |
| ---- | ------- | ------------- |
| Python | 3.10+ (3.14 works) | Install from [python.org](https://www.python.org/downloads/), tick **"Add python.exe to PATH"**. Verify with `py --version`. |
| Node.js | 18+ | Install LTS from [nodejs.org](https://nodejs.org/). Verify with `node --version` and `npm --version`. |
| git | any recent | Install from [git-scm.com](https://git-scm.com/). |
| Disk | ~4 GB free | Model weights (~350 MB) + PyTorch (~2 GB). |

No GPU required — everything runs on CPU.

---

## 2. Clone the repo

Open **PowerShell** and run:

```powershell
git clone https://github.com/Arp1tSingh/Deepguard-v2.git
cd Deepguard-v2   # folder may be named "deepguard" locally
```

> If `git` is not recognized, close and reopen PowerShell after installing
> git. If cloning into `C:\` fails with permission errors, use your user
> folder (e.g. `cd $HOME\Projects` first).

---

## 3. Backend setup (FastAPI, port 8000)

Open a **first PowerShell terminal** and keep it for the backend.

```powershell
cd deepguard-backend

# Create and activate a virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1
```

> If activation is blocked (`running scripts is disabled on this system`),
> run PowerShell **as Administrator** once and execute:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
> Then close the admin window and activate again in your normal terminal.
> (`python -m venv venv` also works if `py` is not on PATH.)

Install dependencies:

```powershell
pip install -r requirements.txt
```

> **Low-end machines:** install the CPU-only PyTorch first to skip ~2 GB of
> unused CUDA libraries, then the rest:
> ```powershell
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
> pip install -r requirements.txt
> ```
> Do **not** install `dlib` or `imgaug` manually — they are training-time-only
> deps with committed stubs (`stubs/`). `opencv-python-headless` must stay on
> 4.x (v5 removed `CascadeClassifier`, which face detection uses).

Download the face-detector models (one-time, ~10 MB, git-ignored):

```powershell
py scripts\download_face_models.py
```

Place the three detector checkpoints here (git-ignored, download links are in
the official DeepfakeBench README/releases):

```
DeepfakeBench\training\weights\
├── ucf_best.pth        (~188 MB)
├── spsl_best.pth       (~88 MB)
└── xception_best.pth   (~88 MB)
```

> Without these files the backend still starts but falls back to mock scores
> — verdicts will look confident but mean nothing. Always check for the
> fallback warning in the backend terminal (see Verify below).

Start the backend:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Verify:** open http://localhost:8000/api/health in your browser — you must
see `{"status":"ok"}`. API docs live at http://localhost:8000/docs.

> Run exactly **one** worker and no `--reload` flag here. Jobs live in a
> process-local dict, so extra workers break status polling. The
> `torch.jit.script` FutureWarning on Python 3.14 is benign noise — ignore it.

---

## 4. Frontend setup (Next.js, port 3000)

Open a **second PowerShell terminal** and keep it for the frontend
(the backend keeps running in the first one).

```powershell
cd deepguard-frontend

npm install

# Point the frontend at the backend
copy .env.example .env.local
# .env.local must contain:
# NEXT_PUBLIC_DEEPGUARD_API_URL=http://localhost:8000

npm run dev
```

**Verify:** open http://localhost:3000 — the DeepGuard dashboard loads.

> `NEXT_PUBLIC_*` variables are baked in at **build time**. If you edit
> `.env.local`, stop (`Ctrl+C`) and restart `npm run dev`.
>
> Other commands: `npm run lint` (must pass clean), `npm run build`
> (production build), `npm run start` (serve the production build).

---

## 5. Use it

1. In http://localhost:3000, drag & drop an MP4/WebM/MOV (max 500 MB).
2. Wait through the staged progress (~25–30s). The 2.5s poll loop doubles as
   a keep-alive, so leave the tab open.
3. The page auto-scrolls to the result: compact **verdict card**
   (FAKE/REAL + confidence ring), then **Evidence** (original vs. Grad-CAM
   wipe slider), **Forensic Signals** (per-model bars + agreement), and
   **Temporal Analysis** (3-line UCF/SPSL/Xception chart).
4. **Export Report** downloads the backend-generated PDF (SPA state is kept).

Re-uploading a new video fully resets all sections.

---

## 6. Troubleshooting (Windows)

| Symptom | Fix |
| ------- | --- |
| `py` not recognized | Reinstall Python with **"Add python.exe to PATH"** ticked, reopen PowerShell; or use `python` instead of `py`. |
| `.\venv\Scripts\Activate.ps1` blocked | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in an admin PowerShell, then retry in a normal one. |
| `npm` not recognized | Reinstall Node.js LTS, reopen PowerShell. |
| Port 8000/3000 already in use | Stop the other program, or use another port (backend: `--port 8001`; frontend: `npm run dev -- --port 3001` — then update `.env.local` and restart). |
| Backend warns about mock models / missing checkpoints | Drop the 3 `.pth` files into `DeepfakeBench\training\weights\` and restart uvicorn. |
| Frontend shows blank/errors, backend unreachable | Backend terminal must still be running; `http://localhost:8000/api/health` must return `{"status":"ok"}`. Check Windows Firewall if the browser can't reach it. |
| Changed `.env.local` but nothing happened | Restart `npm run dev` — `NEXT_PUBLIC_*` is inlined at build/dev start. |
| Analysis is very slow | Expected on CPU (25–30s+, minutes on low-end). Keep videos short; close heavy apps. |
| `torch.jit.script` FutureWarning | Benign on Python 3.14 — ignore. |
| Path-too-long errors on clone/install | Clone into a short path like `C:\dg`, or enable long paths in Windows. |

---

## API contract (backend → frontend)

Base URL: `NEXT_PUBLIC_DEEPGUARD_API_URL` (default `http://localhost:8000`).
Contract changes are additive — existing field names never change.

| Method | Endpoint | Returns |
| ------ | -------- | ------- |
| POST | `/api/upload` (multipart `file`) | `{video_id, status}` |
| GET | `/api/videos/{id}/status` | `{status, progress, error?}` |
| GET | `/api/videos/{id}/verdict` | `{label, confidence, agreement, models[]}` |
| GET | `/api/videos/{id}/evidence` | `{original_video_url, frames[]}` |
| GET | `/api/videos/{id}/signals` | `{models[], agreement, agreement_spread}` |
| GET | `/api/videos/{id}/timeline` | `{duration_sec, points[]}` (`xception`/`spsl`/`ucf` per point) |
| GET | `/api/videos/{id}/explanation` | `{summary, models[] (+faithfulness), key_frames[], trend, spread_detail, caveats[]}` |
| GET | `/api/videos/{id}/export` | PDF download |
| GET | `/api/videos/{id}/original`, `/frames/{n}/original`, `/frames/{n}/heatmap` | raw media |

Notes:

- `agreement` (`high`/`mixed`/`disputed`) is **distinct** from `confidence` —
  the UI shows both separately on purpose.
- A frame's `face_confidence` is Xception's per-frame P(fake), **not**
  face-detection confidence — the UI labels it "Fake Prob".
- Backend media URLs are relative paths; the frontend prefixes them with the
  API base URL.

---

## Project structure

```
deepguard/
├── README.md                  ← you are here (Windows install guide)
├── AGENTS.md                  ← contributor guide (how to work in the repo)
├── DeepfakeBench/             ← vendored detector code (weights git-ignored)
│   └── training/weights/      ← place ucf/spsl/xception .pth here (local only)
├── deepguard-backend/
│   ├── main.py                ← FastAPI app + all endpoints
│   ├── analysis.py            ← 3-model pipeline + Grad-CAM frame extraction
│   ├── gradcam.py             ← Xception Grad-CAM
│   ├── pdf_export.py          ← server-side PDF report
│   ├── scripts/download_face_models.py ← one-time face-model download
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
repo (rather than a submodule or package) because the backend imports it
directly (`analysis.py` loads detector classes, configs, and `.pth`
checkpoints from `DeepfakeBench/training`), and because it carries one local
patch: `training/dataset/lsda_dataset.py` called
`torch.cuda.get_device_name()` at import time and crashed on GPU-less
machines — the vendored copy guards that call so CPU-only setups work.

Only a slice is used (`detectors/`, `networks/`, `loss/`, `metrics/`, three
YAML configs). The three `.pth` checkpoints (~350 MB) are **git-ignored**;
what's committed is source code (~5 MB).

---

## Deploying (production)

- **Backend** → Oracle Cloud VPS via Docker Compose. Full guide:
  [`DEPLOY_ORACLE.md`](DEPLOY_ORACLE.md) (VM setup, firewall ports, weights
  via `scp`, HTTPS with DuckDNS + nginx + certbot, reboot survival, CORS
  tightening).
- **Frontend** → Vercel. Import the repo (root `deepguard-frontend`), set
  `NEXT_PUBLIC_DEEPGUARD_API_URL` to the HTTPS backend URL **before**
  building — a localhost-baked build fails silently in the browser.

---

## Known limitations

- **CPU-only inference** — slow on low-end hardware by design; GPU support is
  a future improvement.
- **Face detection** uses OpenCV's DNN SSD detector (`res10`, CPU-friendly),
  gated by confidence (≥ 0.3) plus size/aspect checks. Frames with no passing
  detection are skipped and surface as "No face detected" instead of silently
  analyzing background.
- **Grad-CAM is per-model** (UCF / SPSL / Xception), selectable in the
  Evidence Inspector. SPSL's heatmap covers its RGB branch only, not the
  frequency phase-spectrum branch; UCF's hooks the forgery encoder — both
  approximate.
- **Single-process job registry** persisted to `storage/` — fine for local
  use, not production traffic (no queue, retry, or cleanup).
- **CORS is wide-open** (`allow_origins=["*"]`) and there is **no auth** —
  fine for local dev, must be tightened before any public hosting.
- Per-model accuracy notes come from a small 20-clip eval — indicative, not
  a guarantee.
- **Explainability is measurement-grounded, not generative.** The "Why this
  verdict" panel is built deterministically from the run's scores (no LLM):
  every claim traces to a shown number, including a per-model heatmap
  faithfulness check (mask-top-region → re-score drop). A ~0 drop is reported
  honestly. Heatmaps mark regions correlated with the prediction —
  correlation, not proof of manipulation.
