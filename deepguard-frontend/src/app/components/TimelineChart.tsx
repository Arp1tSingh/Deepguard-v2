"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";

const MODEL_KEYS = ["xception", "spsl", "ucf"] as const;

export function TimelineChart() {
  const { timeline, uploadStatus } = useDeepGuard();
  const [hovered, setHovered] = useState<number | null>(null);
  const isLoading = !timeline && (uploadStatus === "queued" || uploadStatus === "processing");

  const W = 600;
  const H = 160;
  const PAD = 16;

  const pts = useMemo(() => {
    if (!timeline || timeline.points.length === 0) return [];
    return timeline.points.map((d, i) => ({
      x: PAD + (i / Math.max(1, timeline.points.length - 1)) * (W - PAD * 2),
      ...d,
    }));
  }, [timeline]);

  const linePaths = useMemo(() => {
    const result: Record<string, string> = {};
    if (!timeline || timeline.points.length === 0) return result;
    for (const key of MODEL_KEYS) {
      const p = timeline.points.map((d, i) => ({
        x: PAD + (i / Math.max(1, timeline.points.length - 1)) * (W - PAD * 2),
        y: H - PAD - (d[key] / 100) * (H - PAD * 2),
      }));
      result[key] = p.map((pp, i) => `${i === 0 ? "M" : "L"}${pp.x},${pp.y}`).join(" ");
    }
    return result;
  }, [timeline]);

  const areaPaths = useMemo(() => {
    const result: Record<string, string> = {};
    if (!timeline || timeline.points.length === 0) return result;
    for (const key of MODEL_KEYS) {
      const p = timeline.points.map((d, i) => ({
        x: PAD + (i / Math.max(1, timeline.points.length - 1)) * (W - PAD * 2),
        y: H - PAD - (d[key] / 100) * (H - PAD * 2),
      }));
      const line = p.map((pp, i) => `${i === 0 ? "M" : "L"}${pp.x},${pp.y}`).join(" ");
      result[key] = `${line} L${p[p.length - 1].x},${H - PAD} L${p[0].x},${H - PAD}Z`;
    }
    return result;
  }, [timeline]);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
          Temporal Analysis
        </h2>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            <span className="ml-3 text-zinc-500">Loading timeline...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline || timeline.points.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
          Temporal Analysis
        </h2>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-zinc-600 text-center py-8">Upload a video to view the timeline chart</p>
        </div>
      </div>
    );
  }

  const xPts = pts.map((p) => ({ ...p, y: H - PAD - (p.xception / 100) * (H - PAD * 2) }));
  const peaks = xPts.filter((p, i) => i > 0 && i < xPts.length - 1 && p.xception > xPts[i - 1].xception && p.xception > xPts[i + 1].xception && p.xception > 20);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Temporal Analysis
      </h2>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400"><Clock className="w-4 h-4" /><span>Fake probability over time</span></div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {MODEL_KEYS.map((key) => (
              <span key={key} className="flex items-center gap-1 text-zinc-400">
                <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: MODEL_COLORS[key] }} />
                {MODEL_NAMES[key]}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[400px]" style={{ height: 180 }}>
            <defs>
              {MODEL_KEYS.map((key) => (
                <linearGradient key={key} id={`tg-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MODEL_COLORS[key]} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={MODEL_COLORS[key]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {[25, 50, 75].map((v) => (
              <line key={v} x1={PAD} y1={H - PAD - (v / 100) * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - (v / 100) * (H - PAD * 2)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
            ))}
            {MODEL_KEYS.map((key) => (
              <motion.path key={`area-${key}`} d={areaPaths[key]} fill={`url(#tg-${key})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
            ))}
            {MODEL_KEYS.map((key) => (
              <motion.path key={`line-${key}`} d={linePaths[key]} fill="none" stroke={MODEL_COLORS[key]} strokeWidth={2} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
            ))}
            {peaks.map((p, i) => (
              <motion.circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" opacity={0.5} initial={{ r: 0 }} animate={{ r: 4 }} transition={{ delay: 1.6 + i * 0.15 }} />
            ))}
            {hovered !== null && xPts[hovered] && (
              <circle cx={xPts[hovered].x} cy={xPts[hovered].y} r={5} fill="white" opacity={0.8} />
            )}
          </svg>
          <div className="flex justify-between text-[10px] text-zinc-600 px-4 mt-1 font-mono">
            {Array.from({ length: Math.min(7, timeline.points.length) }, (_, i) => {
              const idx = Math.floor((i / 6) * (timeline.points.length - 1));
              return <span key={i}>{timeline.points[idx]?.timestamp ?? ""}</span>;
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {timeline.points.filter((_, i) => i % Math.max(1, Math.floor(timeline.points.length / 6)) === 0).slice(0, 6).map((d, i) => (
            <motion.button key={i} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              className="p-2 rounded-lg text-center text-xs transition-all duration-300 glass-card interactive-card">
              <p className="font-mono font-bold text-zinc-200">{d.xception.toFixed(0)}%</p>
              <p className="text-[10px] mt-0.5 text-zinc-500 font-mono">{d.timestamp}</p>
            </motion.button>
          ))}
        </div>

        {/* Model legend values */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {MODEL_KEYS.map((key) => {
            const lastPoint = timeline.points[timeline.points.length - 1];
            return (
              <div key={key} className="p-3 rounded-xl glass-card text-center">
                <p className="text-xs text-zinc-500 mb-1">{MODEL_NAMES[key]} (final)</p>
                <p className="text-lg font-bold font-mono" style={{ color: MODEL_COLORS[key] }}>
                  {lastPoint[key].toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}