"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";

const MODEL_KEYS = ["xception", "spsl", "ucf"] as const;

export function TimelineChart() {
  const { timeline, signals } = useDeepGuard();
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 600;
  const H = 160;
  const PAD = 16;

  // X position follows wall-clock time so dropped/skipped frames don't
  // compress time. Falls back to even index spacing for photos (duration 0).
  const xFor = (point: { time_sec: number }, i: number, n: number) => {
    const duration = timeline?.duration_sec ?? 0;
    if (duration > 0) {
      return PAD + (point.time_sec / duration) * (W - PAD * 2);
    }
    return PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2);
  };

  const pts = useMemo(() => {
    if (!timeline || timeline.points.length === 0) return [];
    return timeline.points.map((d, i) => ({
      x: xFor(d, i, timeline.points.length),
      ...d,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  const linePaths = useMemo(() => {
    const result: Record<string, string> = {};
    if (!timeline || timeline.points.length === 0) return result;
    for (const key of MODEL_KEYS) {
      const p = timeline.points.map((d, i) => ({
        x: xFor(d, i, timeline.points.length),
        y: H - PAD - (d[key] / 100) * (H - PAD * 2),
      }));
      result[key] = p.map((pp, i) => `${i === 0 ? "M" : "L"}${pp.x},${pp.y}`).join(" ");
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  if (!timeline) return null;

  const xPts = pts.map((p) => ({ ...p, y: H - PAD - (p.xception / 100) * (H - PAD * 2) }));
  const peaks = xPts.filter((p, i) => i > 0 && i < xPts.length - 1 && p.xception > xPts[i - 1].xception && p.xception > xPts[i + 1].xception && p.xception > 20);

  // Video-level averages from signals — the same numbers ReportPanel shows,
  // so every surface agrees. Falls back to the last plotted point.
  const avgFor = (key: (typeof MODEL_KEYS)[number]) => {
    const found = signals?.models.find((m) => m.name.toLowerCase() === key);
    if (found) return found.score;
    const last = timeline.points[timeline.points.length - 1];
    return last ? last[key] : 0;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span>Fake probability over time</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium bg-white/5 py-1.5 px-3 rounded-md">
          {MODEL_KEYS.map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ backgroundColor: MODEL_COLORS[key] }} />
              {MODEL_NAMES[key]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px] border border-white/5 bg-[rgba(255,255,255,0.015)] rounded-lg" style={{ height: 180 }}>
          {[25, 50, 75].map((v) => (
            <line key={v} x1={PAD} y1={H - PAD - (v / 100) * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - (v / 100) * (H - PAD * 2)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          ))}
          {MODEL_KEYS.map((key) => (
            <path key={`line-${key}`} d={linePaths[key]} fill="none" stroke={MODEL_COLORS[key]} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {peaks.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#fff" opacity={0.6} />
          ))}
          {hovered !== null && xPts[hovered] && (
            <circle cx={xPts[hovered].x} cy={xPts[hovered].y} r={5} fill="#fff" stroke="var(--fake)" strokeWidth={2} />
          )}
        </svg>
        <div className="flex justify-between text-xs text-zinc-500 px-4 mt-3 font-mono">
          {Array.from({ length: Math.min(7, timeline.points.length) }, (_, i) => {
            const idx = Math.floor((i / 6) * (timeline.points.length - 1));
            return <span key={i}>{timeline.points[idx]?.timestamp ?? ""}</span>;
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6">
        {MODEL_KEYS.map((key) => (
          <div key={key} className="p-4 rounded-lg nested-card flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">{MODEL_NAMES[key]}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">video average</p>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: MODEL_COLORS[key] }}>
              {avgFor(key).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
