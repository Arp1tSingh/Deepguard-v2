"""
Deepguard backend API.

Endpoints map directly onto the frontend's sections:
  POST /api/upload                          -> Upload
  GET  /api/videos/{id}/status               -> polling while analysis runs
  GET  /api/videos/{id}/verdict              -> Verdict
  GET  /api/videos/{id}/evidence             -> Evidence Inspector (original + per-frame heatmaps)
  GET  /api/videos/{id}/signals              -> Forensic Signals
  GET  /api/videos/{id}/timeline             -> Temporal Analysis
  GET  /api/videos/{id}/export               -> Export Report (PDF)
  GET  /api/videos/{id}/original             -> serves the uploaded video file
  GET  /api/videos/{id}/frames/{n}/original  -> serves a sampled frame's face crop
  GET  /api/videos/{id}/frames/{n}/heatmap   -> serves that frame's Grad-CAM overlay

Run with:  uvicorn main:app --host 0.0.0.0 --port 8000
See backend/README.md for the full contract, assumptions, and how to point
the existing frontend at this.
"""
import os
import json
import uuid
import shutil
import traceback
from threading import Thread

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from analysis import analyze_video
from pdf_export import build_pdf_report

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BACKEND_DIR, "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="Deepguard Backend")

# CORS origins come from ALLOW_ORIGINS (comma-separated). Default "*" keeps
# local dev working; production sets it to the real frontend origin, e.g.
# ALLOW_ORIGINS=https://deepguard.vercel.app
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOW_ORIGINS", "*").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _verify_weights():
    # Fail fast in production (REQUIRE_WEIGHTS=1) instead of serving
    # confident-looking verdicts from randomly-initialized networks.
    if os.environ.get("REQUIRE_WEIGHTS", "") == "1":
        from analysis import MODEL_SPECS, DFB_ROOT

        missing = [
            weights_rel
            for _key, _name, _cfg, weights_rel, _note in MODEL_SPECS
            if not os.path.exists(os.path.join(DFB_ROOT, weights_rel))
        ]
        if missing:
            raise RuntimeError(f"Missing model checkpoints: {missing}")

# In-memory job registry. Fine for a single-process prototype; swap for a
# real DB/queue (e.g. Redis + RQ/Celery) before this needs to survive
# restarts or run across multiple workers.
JOBS = {}


def _video_dir(video_id):
    return os.path.join(STORAGE_DIR, video_id)


def _run_analysis(video_id, video_path):
    frames_dir = os.path.join(_video_dir(video_id), "frames")
    try:
        JOBS[video_id]["status"] = "processing"

        def progress(msg):
            JOBS[video_id]["progress"] = msg

        result = analyze_video(video_path, frames_dir, progress_cb=progress)
        JOBS[video_id]["status"] = "done"
        JOBS[video_id]["result"] = result
        with open(os.path.join(_video_dir(video_id), "result.json"), "w") as f:
            json.dump(result, f)
    except Exception as e:
        JOBS[video_id]["status"] = "error"
        JOBS[video_id]["error"] = str(e)
        JOBS[video_id]["traceback"] = traceback.format_exc()


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    video_id = uuid.uuid4().hex[:12]
    vdir = _video_dir(video_id)
    os.makedirs(vdir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    video_path = os.path.join(vdir, f"original{ext}")
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    JOBS[video_id] = {"status": "queued", "video_path": video_path, "progress": None}
    thread = Thread(target=_run_analysis, args=(video_id, video_path), daemon=True)
    thread.start()

    return {"video_id": video_id, "status": "queued"}


def _find_video_path(video_id):
    vdir = _video_dir(video_id)
    if not os.path.isdir(vdir):
        return None
    for fname in os.listdir(vdir):
        if fname.startswith("original"):
            return os.path.join(vdir, fname)
    return None


def _get_job(video_id):
    job = JOBS.get(video_id)
    if job:
        return job
    # Not in memory (e.g. server restarted) -- reconstruct from disk if possible.
    result_path = os.path.join(_video_dir(video_id), "result.json")
    video_path = _find_video_path(video_id)
    if os.path.exists(result_path) and video_path:
        with open(result_path) as f:
            result = json.load(f)
        job = {"status": "done", "video_path": video_path, "progress": None, "result": result}
        JOBS[video_id] = job
        return job
    if video_path:
        # Video was uploaded but analysis never finished (e.g. crash mid-run).
        raise HTTPException(status_code=404,
                             detail="Video found but analysis did not complete; re-upload to retry.")
    raise HTTPException(status_code=404, detail="Unknown video_id")


@app.get("/api/videos/{video_id}/status")
async def get_status(video_id: str):
    job = _get_job(video_id)
    resp = {"status": job["status"], "progress": job.get("progress")}
    if job["status"] == "error":
        resp["error"] = job.get("error")
    return resp


def _get_done_result(video_id):
    job = _get_job(video_id)
    if job["status"] == "error":
        raise HTTPException(status_code=500, detail=job.get("error", "Analysis failed"))
    if job["status"] != "done":
        raise HTTPException(status_code=202, detail=f"Still {job['status']}")
    return job["result"]


@app.get("/api/videos/{video_id}/verdict")
async def get_verdict(video_id: str):
    result = _get_done_result(video_id)
    return result["verdict"]


@app.get("/api/videos/{video_id}/evidence")
async def get_evidence(video_id: str):
    result = _get_done_result(video_id)
    frames = []
    for fr in result["frames"]:
        if fr.get("face_detected", True):
            frames.append({
                "timestamp": fr["timestamp"],
                "time_sec": fr["time_sec"],
                "face_detected": True,
                "face_confidence": fr["fake_probability"],  # see backend/README.md: this is P(fake), not face-detection confidence
                "original_frame_url": f"/api/videos/{video_id}/frames/{fr['index']}/original",
                "heatmap_url": f"/api/videos/{video_id}/frames/{fr['index']}/heatmap",
            })
        else:
            # Skipped (no-face) frame: visibly marked, no media URLs.
            # The frontend shows a "No face detected" state instead.
            frames.append({
                "timestamp": fr["timestamp"],
                "time_sec": fr["time_sec"],
                "face_detected": False,
                "face_confidence": None,
                "original_frame_url": None,
                "heatmap_url": None,
            })
    return {
        "original_video_url": f"/api/videos/{video_id}/original",
        "frames": frames,
    }


@app.get("/api/videos/{video_id}/signals")
async def get_signals(video_id: str):
    result = _get_done_result(video_id)
    return result["signals"]


@app.get("/api/videos/{video_id}/timeline")
async def get_timeline(video_id: str):
    result = _get_done_result(video_id)
    return {"duration_sec": result["duration_sec"], "points": result["timeline"]}


@app.get("/api/videos/{video_id}/export")
async def export_pdf(video_id: str):
    result = _get_done_result(video_id)
    out_path = os.path.join(_video_dir(video_id), "report.pdf")
    build_pdf_report(video_id, result, out_path)
    return FileResponse(out_path, media_type="application/pdf", filename=f"deepguard_report_{video_id}.pdf")


@app.get("/api/videos/{video_id}/original")
async def get_original(video_id: str):
    job = _get_job(video_id)
    return FileResponse(job["video_path"])


def _frame_record(video_id, index):
    """Return the stored frame record for index, or None if unavailable
    (job not done yet, unknown id, or legacy result without frame list)."""
    try:
        job = _get_job(video_id)
    except HTTPException:
        return None
    result = job.get("result")
    if not result:
        return None
    frames = result.get("frames", [])
    if 0 <= index < len(frames):
        return frames[index]
    return None


@app.get("/api/videos/{video_id}/frames/{index}/original")
async def get_frame_original(video_id: str, index: int):
    rec = _frame_record(video_id, index)
    if rec is not None and not rec.get("face_detected", True):
        raise HTTPException(status_code=404, detail="no_face_detected")
    path = os.path.join(_video_dir(video_id), "frames", f"frame_{index}_original.jpg")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(path, media_type="image/jpeg")


@app.get("/api/videos/{video_id}/frames/{index}/heatmap")
async def get_frame_heatmap(video_id: str, index: int, model: str = "xception"):
    if model not in ("xception", "spsl", "ucf"):
        raise HTTPException(status_code=400, detail="Unknown model; use ?model=ucf|spsl|xception")
    rec = _frame_record(video_id, index)
    if rec is not None and not rec.get("face_detected", True):
        raise HTTPException(status_code=404, detail="no_face_detected")
    if model == "xception":
        # Legacy flat path (default) — kept for backward compatibility.
        path = os.path.join(_video_dir(video_id), "frames", f"frame_{index}_heatmap.jpg")
    else:
        path = os.path.join(_video_dir(video_id), "heatmaps", model, f"frame_{index}_heatmap.jpg")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(path, media_type="image/jpeg")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
