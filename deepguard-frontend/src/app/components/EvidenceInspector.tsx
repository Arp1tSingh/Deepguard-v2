"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Wand2, Eye, Layers, Maximize2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { api } from "@/lib/deepguard-api";

export function EvidenceInspector() {
  const { evidence, videoId, uploadStatus } = useDeepGuard();
  const [wipe, setWipe] = useState(50);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const frames = evidence?.frames ?? [];
  const isLoading = !evidence && (uploadStatus === "queued" || uploadStatus === "processing");

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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
        Evidence Inspector
      </h2>
      <div className="glass-card rounded-2xl p-6 glow-border space-y-6">

        {/* Video Player */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2"><Eye className="w-4 h-4" />Original Video</h3>
          {videoId && evidence ? (
            <div className="video-container rounded-xl">
              <video src={api.getOriginalVideoUrl(videoId)} controls className="w-full rounded-xl aspect-video relative z-[1]" />
            </div>
          ) : isLoading ? (
            <div className="w-full rounded-xl bg-zinc-900/80 glass-card aspect-video flex items-center justify-center text-zinc-600 text-sm">Waiting for analysis...</div>
          ) : (
            <div className="w-full rounded-xl bg-zinc-900/80 glass-card aspect-video flex items-center justify-center text-zinc-600 text-sm">Upload a video to preview</div>
          )}
        </div>

        {/* Frame Gallery */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />Frame Inspector & Grad-CAM Heatmap</h3>
          {isLoading ? (
            <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="shrink-0 w-28 rounded-lg overflow-hidden border border-white/10 bg-zinc-900 animate-pulse">
                  <div className="aspect-video bg-zinc-800" />
                  <div className="p-2 flex justify-between">
                    <span className="text-[10px] text-zinc-600">--</span>
                    <span className="text-[10px] font-mono text-zinc-600">--%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : frames.length > 0 ? (
            <>
              <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                {frames.map((f, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleFrameSelect(i)}
                    className={`shrink-0 w-28 rounded-lg overflow-hidden glass-card glow-border cursor-pointer hover-lift ${
                      selectedFrame === i ? "ring-2 ring-cyan-400/50" : ""
                    }`}>
                    <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden">
                      {f.original_frame_url && (
                        <img src={api.getFrameOriginalUrl(videoId!, i)} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-xs text-white font-mono">{f.timestamp}</span>
                      </div>
                    </div>
                    <div className="p-2 flex justify-between">
                      <span className="text-[10px] text-zinc-400">Fake Prob</span>
                      <span className="text-[10px] font-mono text-rose-400">{f.face_confidence.toFixed(1)}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Wipe Slider */}
              <div ref={containerRef}
                className="relative rounded-xl overflow-hidden cursor-ew-resize select-none glow-border"
                style={{ aspectRatio: "16/9", background: "#0a0a0f" }}
                onMouseDown={(e) => { setDragging(true); updateWipe(e.clientX); }}>
                {/* Original layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                   {frames[selectedFrame]?.original_frame_url ? (
                      <img src={api.getFrameOriginalUrl(videoId!, selectedFrame)} alt="Original" className="w-full h-full object-cover" />
                   ) : (
                      <div className="text-center">
                        <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">Original Frame</p>
                      </div>
                   )}
                </div>
                {/* Heatmap layer */}
                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
                  <div className="absolute inset-0 flex items-center justify-center animate-shimmer"
                    style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.55) 0%, rgba(168,85,247,0.4) 50%, rgba(249,115,22,0.35) 100%)" }}>
                    {frames[selectedFrame]?.heatmap_url ? (
                      <img src={api.getFrameHeatmapUrl(videoId!, selectedFrame)} alt="Heatmap" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center"><Wand2 className="w-8 h-8 text-red-300 mx-auto mb-2" /><p className="text-sm text-red-300">Grad-CAM Heatmap</p></div>
                    )}
                  </div>
                </div>
                {/* Divider line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none" style={{ left: `${wipe}%` }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-3 bg-black/60 px-2 py-0.5 rounded text-[10px] text-zinc-200 backdrop-blur-sm">Original</div>
                <div className="absolute bottom-2 right-3 bg-black/60 px-2 py-0.5 rounded text-[10px] text-red-300 backdrop-blur-sm">Grad-CAM</div>
              </div>
              <input type="range" min={0} max={100} value={wipe} onChange={(e) => setWipe(Number(e.target.value))}
                className="w-full mt-3 accent-cyan-400" />
            </>
          ) : (
            <p className="text-zinc-600 text-center py-8">Upload a video to view frame evidence</p>
          )}
        </div>
      </div>
    </div>
  );
}