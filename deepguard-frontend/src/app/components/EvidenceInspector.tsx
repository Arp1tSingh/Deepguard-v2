"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, Layers } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { api } from "@/lib/deepguard-api";
import { StatusPill } from "./StatusPill";

export function EvidenceInspector() {
  const { evidence, videoId } = useDeepGuard();
  const [wipe, setWipe] = useState(50);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const frames = evidence?.frames ?? [];

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
                  {f.original_frame_url && (
                    <img src={api.getFrameOriginalUrl(videoId!, i)} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-xs text-white font-mono">{f.timestamp}</span>
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-1 items-center justify-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Fake Prob</span>
                  <StatusPill label={`${f.face_confidence.toFixed(1)}%`} type={f.face_confidence > 50 ? "fake" : "real"} />
                </div>
              </div>
            ))}
          </div>

          {/* Wipe Slider */}
          <div ref={containerRef}
            className="flex-1 relative rounded-xl overflow-hidden cursor-ew-resize select-none border border-white/5"
            style={{ minHeight: "240px", background: "#0a0a0f" }}
            onMouseDown={(e) => { setDragging(true); updateWipe(e.clientX); }}>
            {/* Heatmap base layer (right side revealed) */}
            <div className="absolute inset-0 bg-[rgba(255,255,255,0.02)] flex items-center justify-center">
               {frames[selectedFrame]?.heatmap_url ? (
                  <img src={api.getFrameHeatmapUrl(videoId!, selectedFrame)} alt="Heatmap" className="w-full h-full object-cover pointer-events-none" />
               ) : (
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Grad-CAM Heatmap</p>
                  </div>
               )}
            </div>
            {/* Original layer clipped to left of wipe */}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {frames[selectedFrame]?.original_frame_url ? (
                  <img src={api.getFrameOriginalUrl(videoId!, selectedFrame)} alt="Original" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <p className="text-sm text-zinc-500">Original Frame</p>
                )}
              </div>
            </div>
            {/* Divider line */}
            <div className="absolute top-0 bottom-0 wipe-handle" style={{ left: `${wipe}%` }} />

            <div className="absolute bottom-3 left-4 bg-black/80 px-2.5 py-1 rounded text-xs font-medium text-zinc-200 backdrop-blur-md">Original</div>
            <div className="absolute bottom-3 right-4 bg-black/80 px-2.5 py-1 rounded text-xs font-medium text-[var(--accent)] backdrop-blur-md">Grad-CAM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
