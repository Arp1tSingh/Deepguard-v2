"use client";

import { motion } from "framer-motion";
import { Radar, Activity } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";

export function SignalBreakdown() {
  const { signals, uploadStatus } = useDeepGuard();
  const isLoading = !signals && (uploadStatus === "queued" || uploadStatus === "processing");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Forensic Signals
      </h2>

      <div className="glass-card rounded-2xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            <span className="ml-3 text-zinc-500">Loading signals...</span>
          </div>
        ) : signals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: per-model bars */}
            <div className="space-y-4">
              {signals.models.map((model, i) => {
                const color = MODEL_COLORS[model.name.toLowerCase()] || "var(--accent)";
                const name = MODEL_NAMES[model.name.toLowerCase()] || model.name;
                return (
                  <motion.div key={model.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-300 font-medium">{name}</span>
                      <span className="text-sm font-mono font-bold" style={{ color }}>{model.score.toFixed(1)}%</span>
                    </div>
                    <div className="signal-meter">
                      <motion.div className="signal-meter-fill" style={{ backgroundColor: color }}
                        initial={{ width: 0 }} animate={{ width: `${model.score}%` }} transition={{ delay: i * 0.1 + 0.2, duration: 0.9, ease: "easeOut" }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right: agreement + spread */}
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                className="glass-card p-6 rounded-xl text-center">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <Radar className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-bold text-zinc-200">Agreement Level</h3>
                </div>
                <p className={`text-6xl font-bold ${
                  signals.agreement === "high" ? "text-[var(--real)]" :
                  signals.agreement === "mixed" ? "text-[var(--disputed)]" :
                  "text-[var(--fake)]"
                }`}>
                  {signals.agreement === "high" ? "✓" : signals.agreement === "mixed" ? "≈" : "✗"}
                </p>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full mt-3 inline-block ${
                  signals.agreement === "high" ? "bg-[var(--real)]/15 text-[var(--real)]" :
                  signals.agreement === "mixed" ? "bg-[var(--disputed)]/15 text-[var(--disputed)]" :
                  "bg-[var(--fake)]/15 text-[var(--fake)]"
                }`}>
                  {signals.agreement.toUpperCase()}
                </span>
                <p className="text-xs text-zinc-500 mt-4">Model consensus across UCF, SPSL, Xception</p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-200">Agreement Spread</span>
                </div>
                <p className="text-3xl font-bold text-zinc-100 font-mono">{signals.agreement_spread.toFixed(1)}%</p>
                <p className="text-xs text-zinc-500 mt-1">Percentage-point gap between highest and lowest model score</p>
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--real)] via-[var(--disputed)] to-[var(--fake)]"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, signals.agreement_spread * 5)}%` }} transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }} />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="p-4 rounded-xl glass-card">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-200">Interpretation</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {signals.agreement === "high"
                    ? "All three models agree strongly — this result is highly reliable."
                    : signals.agreement === "mixed"
                    ? "Models partially agree. Results should be interpreted with some caution."
                    : "Models disagree significantly. Individual model results vary widely — review each model's score carefully."}
                </p>
              </motion.div>
            </div>
          </div>
        ) : (
          <p className="text-zinc-600 text-center py-8">Upload a video to view forensic signal analysis</p>
        )}
      </div>
    </div>
  );
}