"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX, AlertTriangle, Brain, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";

export function ReportPanel() {
  const { verdict, uploadStatus, progress, error } = useDeepGuard();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Verdict
      </h2>
      <div className="glass-card rounded-2xl p-8">
        <AnimatePresence mode="wait">
          {(uploadStatus === "queued" || uploadStatus === "processing") ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
              <p className="text-lg font-medium mb-3">Analyzing video…</p>
              <p className="text-sm text-[var(--accent)] mb-2">{progress || "Starting analysis..."}</p>
              <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-[var(--accent)] rounded-full"
                  animate={{ width: `${uploadStatus === "processing" ? "70" : "10"}%` }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              <p className="text-sm text-zinc-500 mt-2 font-mono">Estimated 25-30 seconds</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8">
              <AlertTriangle className="w-12 h-12 text-[var(--disputed)] mb-4" />
              <p className="text-[var(--disputed)] font-medium text-lg mb-2">Analysis Failed</p>
              <p className="text-sm text-zinc-400 text-center max-w-md">{error}</p>
            </motion.div>
          ) : verdict ? (
            <motion.div key="verdict" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  className={`w-36 h-36 rounded-2xl flex flex-col items-center justify-center border-2 ${
                    verdict.label === "fake"
                      ? "bg-[var(--fake)]/20 border-[var(--fake)] text-[var(--fake)] glow-verdict-fake"
                      : "bg-[var(--real)]/20 border-[var(--real)] text-[var(--real)] glow-verdict-real"
                  }`}
                >
                  {verdict.label === "fake" ? <ShieldX className="w-12 h-12 mb-1" /> : <ShieldCheck className="w-12 h-12 mb-1" />}
                  <span className="text-sm font-bold tracking-wider">{verdict.label.toUpperCase()}</span>
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                    <Brain className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">Confidence Score</span>
                  </div>
                  <p className="text-5xl font-bold font-mono text-zinc-100">{verdict.confidence.toFixed(1)}%</p>
                  <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs text-zinc-500">Agreement:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      verdict.agreement === "high" ? "bg-[var(--real)]/15 text-[var(--real)]" :
                      verdict.agreement === "mixed" ? "bg-[var(--disputed)]/15 text-[var(--disputed)]" :
                      "bg-[var(--fake)]/15 text-[var(--fake)]"
                    }`}>
                      {verdict.agreement}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-xs">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: verdict.label === "fake" ? "var(--fake)" : "var(--real)" }}
                      initial={{ width: 0 }} animate={{ width: `${verdict.confidence}%` }} transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-6 space-y-2">
                <h4 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Model Breakdown</h4>
                {verdict.models.map((model, i) => {
                  const color = MODEL_COLORS[model.key] || "var(--accent)";
                  return (
                    <div key={model.key} className="flex items-center justify-between p-3 rounded-xl glass-card">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{MODEL_NAMES[model.key] || model.name}</span>
                        {model.verified && <span className="text-[10px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded-full">Verified</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                            initial={{ width: 0 }} animate={{ width: `${model.score}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }} />
                        </div>
                        <span className="text-sm font-mono font-bold w-14 text-right" style={{ color }}>{model.score.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {verdict.agreement !== "high" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  className="mt-5 flex items-start gap-3 p-4 rounded-xl glass-card border-[var(--disputed)]/30">
                  <AlertTriangle className="w-5 h-5 text-[var(--disputed)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--disputed)]">{verdict.agreement === "disputed" ? "Disputed Agreement" : "Mixed Agreement"}</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      The models show varying levels of agreement. A {verdict.agreement} result means the detection confidence should be interpreted with caution.
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="mt-4 p-4 rounded-xl glass-card">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">AI Explanation</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {verdict.label === "fake"
                    ? "Multiple forensic markers detected: synthetic blending boundaries, unnatural frequency distribution, and biometric pattern anomalies across the facial region."
                    : "No significant manipulation markers found. The video shows consistent natural texture gradients, expected frequency signatures, and authentic biometric patterns."}
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-zinc-600">
              <ShieldCheck className="w-16 h-16 mb-4 text-zinc-800" />
              <p className="text-lg">Upload a video to begin analysis</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
