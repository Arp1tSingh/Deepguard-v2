"use client";

import { motion } from "framer-motion";
import { Radar, Activity } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

const MODEL_KEYS = ["xception", "spsl", "ucf"] as const;

export function SignalBreakdown() {
  const { signals, uploadStatus } = useDeepGuard();
  const isLoading = !signals && (uploadStatus === "queued" || uploadStatus === "processing");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-[var(--accent)] inline-block" />
        Forensic Signals
      </h2>

      <div className="glass-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            <span className="ml-3 text-sm text-zinc-500">Loading signals...</span>
          </div>
        ) : signals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: per-model bars */}
            <div className="space-y-4">
              {signals.models.map((model) => {
                const color = MODEL_COLORS[model.name.toLowerCase()] || "var(--accent)";
                const name = MODEL_NAMES[model.name.toLowerCase()] || model.name;
                return (
                  <div key={model.name} className="p-4 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-zinc-300 font-medium">{name}</span>
                      <span className="text-sm font-mono font-bold text-zinc-100">{model.score.toFixed(1)}%</span>
                    </div>
                    <div className="signal-meter">
                      <motion.div className="signal-meter-fill" style={{ backgroundColor: color }}
                        initial={{ width: 0 }} animate={{ width: `${model.score}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: agreement + spread */}
            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5 text-center flex flex-col items-center justify-center h-[calc(50%-12px)]">
                <div className="flex items-center gap-2 mb-3">
                  <Radar className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-300">Agreement Level</h3>
                </div>
                <StatusPill 
                  label={signals.agreement.toUpperCase()} 
                  type={signals.agreement === "high" ? "real" : signals.agreement === "mixed" ? "disputed" : "fake"} 
                />
              </div>

              <div className="p-6 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5 text-center flex flex-col items-center justify-center h-[calc(50%-12px)]">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-300">Agreement Spread</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-100 font-mono mb-3">{signals.agreement_spread.toFixed(1)}%</p>
                <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--real)] via-[var(--disputed)] to-[var(--fake)]"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, signals.agreement_spread * 5)}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 text-center py-12">Upload a video to view forensic signal analysis</p>
        )}
      </div>
    </div>
  );
}