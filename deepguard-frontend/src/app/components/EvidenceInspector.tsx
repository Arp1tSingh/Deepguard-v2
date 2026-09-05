"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Wand2, Eye, Layers, Maximize2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

const frames = [
  { id: 1, time: "00:01", score: 91 },
  { id: 2, time: "00:04", score: 87 },
  { id: 3, time: "00:07", score: 95 },
  { id: 4, time: "00:10", score: 79 },
  { id: 5, time: "00:13", score: 88 },
];

export function EvidenceInspector() {
  const { videoUrl } = useDeepGuard();
  const [wipe, setWipe] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
          {videoUrl ? (
            <div className="video-container rounded-xl">
              <video src={videoUrl} controls className="w-full rounded-xl aspect-video relative z-[1]" />
            </div>
          ) : (
            <div className="w-full rounded-xl bg-zinc-900/80 glass-card aspect-video flex items-center justify-center text-zinc-600 text-sm">Upload a video to preview</div>
          )}
        </div>

        {/* Frame Gallery */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />Frame Inspector & Grad-CAM Heatmap</h3>
          <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
            {frames.map((f) => (
              <motion.div key={f.id} whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }}
                className="shrink-0 w-28 rounded-lg overflow-hidden glass-card glow-border cursor-pointer hover-lift">
                <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <span className="text-xs text-zinc-500 font-mono">{f.time}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span className="text-[10px] text-zinc-500">face</span>
                  <span className="text-[10px] font-mono text-rose-400">{f.score}%</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Wipe Slider */}
          <div ref={containerRef}
            className="relative rounded-xl overflow-hidden cursor-ew-resize select-none glow-border"
            style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #0a0a0f, #12121a)" }}
            onMouseDown={(e) => { setDragging(true); updateWipe(e.clientX); }}>
            {/* Original layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Original Frame</p>
              </div>
            </div>
            {/* Heatmap layer */}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
              <div className="absolute inset-0 flex items-center justify-center animate-shimmer"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.55) 0%, rgba(168,85,247,0.4) 50%, rgba(249,115,22,0.35) 100%)" }}>
                <div className="text-center"><Wand2 className="w-8 h-8 text-red-300 mx-auto mb-2" /><p className="text-sm text-red-300">Grad-CAM Heatmap</p></div>
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
        </div>
      </div>
    </div>
  );
}
