"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

export function TimelineChart() {
  const { timelineData } = useDeepGuard();
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 600;
  const H = 160;
  const PAD = 16;

  const pts = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return [];
    return timelineData.map((d, i) => ({
      x: PAD + (i / (timelineData.length - 1)) * (W - PAD * 2),
      y: H - PAD - (d.confidence / 100) * (H - PAD * 2),
      ...d,
    }));
  }, [timelineData]);

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD}Z` : "";
  const peaks = pts.filter((p, i) => i > 0 && i < pts.length - 1 && p.confidence > pts[i - 1].confidence && p.confidence > pts[i + 1].confidence && p.confidence > 20);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block animate-pulse" />
        Temporal Analysis
      </h2>

      <div className="glass-card rounded-2xl p-6 glow-border">
        {!timelineData || timelineData.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">Upload a video to view the timeline chart</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400"><Clock className="w-4 h-4" /><span>Frame confidence over time</span></div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-rose-400 inline-block rounded" /> Fake probability</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" /> Peak</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[400px]" style={{ height: 180 }}>
                <defs>
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {[25, 50, 75].map((v) => (
                  <line key={v} x1={PAD} y1={H - PAD - (v / 100) * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - (v / 100) * (H - PAD * 2)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
                ))}
                <motion.path d={areaPath} fill="url(#tg)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
                <motion.path d={linePath} fill="none" stroke="#fb7185" strokeWidth={2} strokeLinecap="round" filter="url(#glow)"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                {peaks.map((p, i) => (
                  <motion.circle key={i} cx={p.x} cy={p.y} r={4} fill="#fbbf24" filter="url(#glow)" initial={{ r: 0 }} animate={{ r: 4 }} transition={{ delay: 1.6 + i * 0.15 }} />
                ))}
                {hovered !== null && pts[hovered] && (
                  <circle cx={pts[hovered].x} cy={pts[hovered].y} r={5} fill="white" opacity={0.8} filter="url(#glow)" />
                )}
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-600 px-4 mt-1">
                {Array.from({ length: 7 }, (_, i) => <span key={i}>{i * 10}s</span>)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
              {timelineData.filter((_, i) => i % 10 === 0).map((d, i) => (
                <motion.button key={i} whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setHovered(d.timestamp)} onMouseLeave={() => setHovered(null)}
                  className={`p-2 rounded-lg text-center text-xs transition-all duration-300 ${
                    d.confidence > 20
                      ? "glass-card glow-rose text-rose-300"
                      : "glass-card text-zinc-500 hover:text-zinc-300"
                  }`}>
                  <p className="font-mono font-bold">{d.confidence.toFixed(0)}%</p>
                  <p className="text-[10px] mt-0.5">{d.timestamp}s</p>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
