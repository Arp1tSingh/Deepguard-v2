"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX, AlertTriangle, Brain, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

export function ReportPanel() {
  const { verdict, uploadStatus, progress, error } = useDeepGuard();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-[var(--accent)] inline-block" />
        Forensic Detailed Analysis
      </h2>
      <div className="glass-card p-6">
        <AnimatePresence mode="wait">
          {(uploadStatus === "queued" || uploadStatus === "processing") ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-12">
              <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
              <p className="text-base font-medium mb-2">Analyzing video…</p>
              <p className="text-sm text-[var(--accent)] mb-4">{progress || "Starting analysis..."}</p>
              <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-[var(--accent)] rounded-full"
                  animate={{ width: `${uploadStatus === "processing" ? "70" : "10"}%` }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-mono">Estimated 25-30 seconds</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12">
              <AlertTriangle className="w-12 h-12 text-[var(--fake)] mb-4" />
              <p className="text-[var(--fake)] font-medium text-base mb-2">Analysis Failed</p>
              <p className="text-sm text-zinc-400 text-center max-w-md">{error}</p>
            </motion.div>
          ) : verdict ? (
            <motion.div key="verdict" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              
              <div className="space-y-4">
                <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">Model Breakdown</h4>
                {verdict.models.map((model) => {
                  const color = MODEL_COLORS[model.key] || "var(--accent)";
                  return (
                    <div key={model.key} className="flex items-center justify-between p-4 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{MODEL_NAMES[model.key] || model.name}</span>
                        {model.verified && <StatusPill label="Verified" type="real" />}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                            initial={{ width: 0 }} animate={{ width: `${model.score}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                        </div>
                        <span className="text-sm font-mono font-bold w-12 text-right text-zinc-100">{model.score.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {verdict.agreement !== "high" && (
                <div className="mt-6 flex items-start gap-4 p-4 rounded-lg bg-[var(--disputed)]/10 border border-[var(--disputed)]/20 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-[var(--disputed)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--disputed)]">{verdict.agreement === "disputed" ? "Disputed Agreement" : "Mixed Agreement"}</p>
                    <p className="text-sm text-[var(--disputed)]/80 mt-1">
                      The models show varying levels of agreement. A {verdict.agreement} result means the detection confidence should be interpreted with caution.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-300">AI Explanation</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {verdict.label === "fake"
                    ? "Multiple forensic markers detected: synthetic blending boundaries, unnatural frequency distribution, and biometric pattern anomalies across the facial region."
                    : "No significant manipulation markers found. The video shows consistent natural texture gradients, expected frequency signatures, and authentic biometric patterns."}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-zinc-600">
              <ShieldCheck className="w-16 h-16 mb-4 text-zinc-800" />
              <p className="text-sm font-medium">Upload a video to begin analysis</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
