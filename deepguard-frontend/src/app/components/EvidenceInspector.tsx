"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, Layers, ScanFace } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { api } from "@/lib/deepguard-api";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

const CAM_MODELS = ["xception", "spsl", "ucf"] as const;
type CamModel = (typeof CAM_MODELS)[number];

export function EvidenceInspector() {
  const { evidence, videoId } = useDeepGuard();
  const [wipe, setWipe] = useState(50);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [camModel, setCamModel] = useState<CamModel>("xception");
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const frames = evidence?.frames ?? [];
  const activeFrame = frames[selectedFrame];
  const hasFace = !!activeFrame?.face_detected;

  const updateWipe = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setWipe(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateWipe(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, updateWipe]);

  const handleFrameSelect = (index: number) => {
    setSelectedFrame(index);
    setWipe(50);
  };

  if (!evidence) {
    return null;
  }

  return (
    <div className="glass-card p-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Video Player */}
        <div className="flex flex-col h-full">
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2"><Eye className="w-4 h-4" />Original Video</h3>
          <div className="video-container flex-1">
            <video src={api.getOriginalVideoUrl(videoId!)} controls className="w-full h-full object-cover relative z-[1]" />
          </div>
        </div>

        {/* Frame Gallery */}
        <div className="flex flex-col h-full">
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2"><Layers className="w-4 h-4" />Frame Inspector & Grad-CAM Heatmap</h3>
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            {frames.map((f, i) => (
              <div key={i} onClick={() => handleFrameSelect(i)}
                className={`shrink-0 w-32 rounded-lg overflow-hidden nested-card cursor-pointer interactive-card transition-all duration-150 ${
                  selectedFrame === i ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]" : ""
                }`}>
                <div className="aspect-video bg-[rgba(255,255,255,0.02)] flex items-center justify-center relative overflow-hidden">
                  {f.face_detected && f.original_frame_url ? (
                    <img src={api.getFrameOriginalUrl(videoId!, i)} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                  ) : (
                    <ScanFace className="w-8 h-8 text-zinc-700" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-xs text-white font-mono">{f.timestamp}</span>
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-1 items-center justify-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Fake Prob</span>
                  {f.face_detected && f.face_confidence !== null ? (
                    <StatusPill label={`${f.face_confidence.toFixed(1)}%`} type={f.face_confidence > 50 ? "fake" : "real"} />
                  ) : (
                    <StatusPill label="No face" type="neutral" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Model switcher */}
          <div className="flex gap-2 mb-4">
            {CAM_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setCamModel(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                  camModel === m
                    ? "border-white/20 bg-white/10 text-zinc-100"
                    : "border-white/5 bg-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1.5"
                  style={{ backgroundColor: MODEL_COLORS[m] }}
                />
                {MODEL_NAMES[m]}
              </button>
            ))}
            {camModel === "spsl" && (
              <span className="text-[10px] text-zinc-600 self-center ml-1">RGB branch only</span>
            )}
          </div>

          {/* Wipe Slider / no-face state */}
          {!hasFace ? (
            <div
              className="flex-1 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2 text-center"
              style={{ minHeight: "240px", background: "#0a0a0f" }}
            >
              <ScanFace className="w-10 h-10 text-zinc-700" />
              <p className="text-sm font-medium text-zinc-400">No face detected in this frame</p>
              <p className="text-xs text-zinc-600 font-mono">
                {activeFrame ? `Frame ${selectedFrame} · ${activeFrame.timestamp} skipped` : ""}
              </p>
            </div>
          ) : (
            <div ref={containerRef}
              className="flex-1 relative rounded-xl overflow-hidden cursor-ew-resize select-none border border-white/5"
              style={{ minHeight: "240px", background: "#0a0a0f" }}
              onMouseDown={(e) => { setDragging(true); updateWipe(e.clientX); }}>
              {/* Heatmap base layer (right side revealed) */}
              <div className="absolute inset-0 bg-[rgba(255,255,255,0.02)] flex items-center justify-center">
                 <img
                   key={`${selectedFrame}-${camModel}`}
                   src={api.getFrameHeatmapUrl(videoId!, selectedFrame, camModel)}
                   alt={`${MODEL_NAMES[camModel]} heatmap`}
                   className="w-full h-full object-cover pointer-events-none"
                 />
              </div>
              {/* Original layer clipped to left of wipe */}
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  {activeFrame?.original_frame_url ? (
                    <img src={api.getFrameOriginalUrl(videoId!, selectedFrame)} alt="Original" className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <p className="text-sm text-zinc-500">Original Frame</p>
                  )}
                </div>
              </div>
              {/* Divider line */}
              <div className="absolute top-0 bottom-0 wipe-handle" style={{ left: `${wipe}%` }} />

              <div className="absolute bottom-3 left-4 bg-black/80 px-2.5 py-1 rounded text-xs font-medium text-zinc-200 backdrop-blur-md">Original</div>
              <div className="absolute bottom-3 right-4 bg-black/80 px-2.5 py-1 rounded text-xs font-medium text-[var(--accent)] backdrop-blur-md">
                Grad-CAM · {MODEL_NAMES[camModel]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
