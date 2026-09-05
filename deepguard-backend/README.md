# Deepguard Backend

A FastAPI backend wired to the 3 verified DeepfakeBench models (UCF, SPSL,
Xception) plus Grad-CAM, built to match the DeepGuard frontend's sections:
Upload, Verdict, Evidence Inspector (Grad-CAM heatmaps), Forensic Signals,
Temporal Analysis, and Export Report.

Tested end-to-end (upload -> analysis -> every endpoint -> PDF export) against
real clips, on CPU only. A full 3-model + Grad-CAM analysis takes ~25-30s
per video in this environment.

## Setup

1. Get the DeepfakeBench repo with the 3 verified detectors and their
   checkpoints set up (see the earlier `deepguard_rebuild_package.zip` /
   `SETUP_NOTES.md` for that part) at `../DeepfakeBench` relative to this
   folder (i.e. `deepguard/DeepfakeBench` and `deepguard/backend` as siblings).
2. `pip install fastapi uvicorn python-multipart reportlab opencv-python-headless`
   (torch/torchvision/etc. from the DeepfakeBench setup)
3. `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`

## Wiring up the existing frontend

The frontend currently has no backend calls at all (it's a static UI shell
with hardcoded placeholder values -- mock timestamps, mock "face 91%" badges,
empty states). To connect it:

1. On the Upload section's drop handler, `POST /api/upload` with the video
   file (multipart `file` field). Store the returned `video_id`.
2. Poll `GET /api/videos/{video_id}/status` (e.g. every 2-3s) until
   `status: "done"` (or `"error"`).
3. Once done, call the four data endpoints below and render each section.
4. Export button calls `GET /api/videos/{video_id}/export` and downloads the
   PDF response.

Set `allow_origins` in `main.py`'s CORS middleware to your actual frontend
origin instead of `"*"` before this goes anywhere real.

## API contract

### `POST /api/upload`
multipart form, field `file`. Returns `{"video_id": str, "status": "queued"}`.

### `GET /api/videos/{video_id}/status`
`{"status": "queued"|"processing"|"done"|"error", "progress": str|null, "error"?: str}`

### `GET /api/videos/{video_id}/verdict` -> Verdict section
```json
{
  "label": "fake" | "real",
  "confidence": 94.5,
  "agreement": "high" | "mixed" | "disputed",
  "models": [
    {"key": "ucf", "name": "UCF", "score": 98.2, "verified": true, "note": "..."},
    ...
  ]
}
```
`confidence` is the mean P(fake) across all 3 models, as a percentage.
`agreement` is derived from how far apart the 3 models' scores are (see
`analysis.py::analyze_video` for the exact thresholds) -- surface this in the
UI; a "high confidence, disputed agreement" case is exactly the kind of
thing this project exists to make visible, not hide behind one number.

### `GET /api/videos/{video_id}/evidence` -> Evidence Inspector section
```json
{
  "original_video_url": "/api/videos/{id}/original",
  "frames": [
    {
      "timestamp": "00:15",
      "time_sec": 15.1,
      "face_confidence": 99.9,
      "original_frame_url": "/api/videos/{id}/frames/0/original",
      "heatmap_url": "/api/videos/{id}/frames/0/heatmap"
    },
    ...
  ]
}
```
**Naming note, read this before wiring the UI:** the frontend mock's "face
91%" badge is ambiguous -- could mean face-detection confidence or
fake-probability. We used OpenCV's Haar cascade for face detection, which
doesn't produce a meaningful confidence score, so `face_confidence` here is
actually **that frame's P(fake) from Xception**, the same model driving the
Grad-CAM heatmap next to it. If the frontend's copy implies "face detected
with X% confidence," that copy should change to something like "fake
probability" -- otherwise it'll misrepresent what the number means.

### `GET /api/videos/{video_id}/signals` -> Forensic Signals section
```json
{
  "models": [{"name": "UCF", "score": 98.2}, ...],
  "agreement": "high",
  "agreement_spread": 9.4
}
```
Good fit for a per-model bar chart plus an agreement badge.

### `GET /api/videos/{video_id}/timeline` -> Temporal Analysis section
```json
{"duration_sec": 60.6, "points": [{"time_sec": 0.0, "timestamp": "00:00", "xception": 98.7, "spsl": 97.7, "ucf": 100.0}, ...]}
```
All 3 models' per-frame scores, so the chart can do a 3-line comparison
instead of just one.

### `GET /api/videos/{video_id}/export`
Returns a PDF (verdict + per-model table + timeline table + caveats).

### `GET /api/videos/{video_id}/original`, `.../frames/{n}/original`, `.../frames/{n}/heatmap`
Raw file responses (video/jpeg) for direct `<video>`/`<img>` `src` use.

## Known limitations -- be upfront about these, don't paper over them

- **5 frames per video.** Matches the frontend mock's 5-thumbnail layout, but
  it's a coarse sample of a video that might be much longer. Increase
  `FRAMES_PER_VIDEO` in `analysis.py` if you want denser sampling -- linear
  cost, ~5-6s more per model per extra frame batch on this CPU-only setup.
- **Face detection uses OpenCV's Haar cascade**, not the paper's dlib
  81-point aligner (no prebuilt dlib wheel was available in the dev sandbox).
  Fine for a clear frontal face; will miss or mis-crop on profile angles,
  occlusion, or multiple faces (it always picks the single largest box).
- **Grad-CAM is Xception-only.** SPSL and UCF contribute their verdict/signal
  scores but not a heatmap -- their architectures (4-channel phase input for
  SPSL, dual-backbone for UCF) need more work to hook cleanly.
- **In-memory job registry with disk fallback.** Results persist to
  `storage/{video_id}/result.json` so a server restart can still serve
  completed analyses, but there's no queue, no retry, and no cleanup of old
  uploads -- fine for a prototype/course project, not for production traffic.
- **No auth, wide-open CORS.** Add both before deploying anywhere reachable
  by the public.
- **Accuracy numbers underneath this are from a 20-clip eval** (see the
  earlier eval harness work) -- real, but a small sample. Don't present the
  per-model "note" fields as more rigorously validated than that.
