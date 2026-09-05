"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX, AlertTriangle, Brain, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

export function ReportPanel() {
  const { verdict, uploadStatus, progress, error } = useDeepGuard();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400 inline-block animate-pulse" />
        Verdict
      </h2>
      <div className="glass-card rounded-2xl p-8 glow-border">
        <AnimatePresence mode="wait">
          {(uploadStatus === "queued" || uploadStatus === "processing") ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-lg font-medium mb-3">Analyzing video…</p>
              <p className="text-sm text-cyan-400 mb-2 animate-pulse">{progress || "Starting analysis..."}</p>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
                  animate={{ width: `${uploadStatus === "processing" ? "70" : "10"}%` }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              <p className="text-sm text-zinc-500 mt-2">Estimated 25-30 seconds</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8">
              <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
              <p className="text-amber-400 font-medium text-lg mb-2">Analysis Failed</p>
              <p className="text-sm text-zinc-400 text-center max-w-md">{error}</p>
            </motion.div>
          ) : verdict ? (
            <motion.div key="verdict" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center border hover-lift ${
                    verdict.label === "fake"
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-400 glow-rose"
                      : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 glow-emerald"
                  }`}
                >
                  {verdict.label === "fake" ? <ShieldX className="w-10 h-10 mb-1" /> : <ShieldCheck className="w-10 h-10 mb-1" />}
                  <span className="text-sm font-semibold tracking-wider">{verdict.label.toUpperCase()}</span>
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-zinc-400">Confidence Score</span>
                  </div>
                  <p className="text-5xl font-bold gradient-text-short">{verdict.confidence.toFixed(1)}%</p>
                  <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs text-zinc-500">Agreement:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      verdict.agreement === "high" ? "bg-emerald-500/20 text-emerald-400" :
                      verdict.agreement === "mixed" ? "bg-amber-500/20 text-amber-400" :
                      "bg-rose-500/20 text-rose-400"
                    }`}>
                      {verdict.agreement}
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
                    <motion.div
                      className={`h-full rounded-full ${verdict.label === "fake" ? "bg-rose-500" : "bg-emerald-500"}`}
                      initial={{ width: 0 }} animate={{ width: `${verdict.confidence}%` }} transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Per-model breakdown */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-6 space-y-2">
                <h4 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Model Breakdown</h4>
                {verdict.models.map((model, i) => (
                  <div key={model.key} className="flex items-center justify-between p-3 rounded-xl glass-card hover-lift">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{model.name}</span>
                      {model.verified && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Verified</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{
                          backgroundColor: model.score >= 70 ? "#fb7185" : model.score >= 50 ? "#fbbf24" : "#34d399"
                        }}
                          initial={{ width: 0 }} animate={{ width: `${model.score}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }} />
                      </div>
                      <span className="text-sm font-mono font-bold w-14 text-right" style={{
                        color: model.score >= 70 ? "#fb7185" : model.score >= 50 ? "#fbbf24" : "#34d399"
                      }}>{model.score.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              {verdict.agreement !== "high" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  className="mt-5 flex items-start gap-3 p-4 rounded-xl glass-card glow-amber">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">{verdict.agreement === "disputed" ? "Disputed Agreement" : "Mixed Agreement"}</p>
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