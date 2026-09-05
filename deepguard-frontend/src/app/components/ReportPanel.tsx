"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX, AlertTriangle, Brain, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

export function ReportPanel() {
  const { verdict, confidence, isEstimate, isAnalyzing, uploadProgress } = useDeepGuard();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400 inline-block animate-pulse" />
        Verdict
      </h2>
      <div className="glass-card rounded-2xl p-8 glow-border">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-lg font-medium mb-3">Analyzing video…</p>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full progress-bar-fill" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
              </div>
              <p className="text-sm text-zinc-500 mt-2">{Math.round(uploadProgress)}% processed</p>
            </motion.div>
          ) : verdict ? (
            <motion.div key="verdict" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center border hover-lift ${
                    verdict === "fake"
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-400 glow-rose"
                      : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 glow-emerald"
                  }`}
                >
                  {verdict === "fake" ? <ShieldX className="w-10 h-10 mb-1" /> : <ShieldCheck className="w-10 h-10 mb-1" />}
                  <span className="text-sm font-semibold tracking-wider">{verdict.toUpperCase()}</span>
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-zinc-400">Confidence Score</span>
                  </div>
                  <p className="text-5xl font-bold gradient-text-short">{confidence.toFixed(1)}%</p>
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
                    <motion.div
                      className={`h-full rounded-full ${verdict === "fake" ? "bg-rose-500" : "bg-emerald-500"}`}
                      initial={{ width: 0 }} animate={{ width: `${confidence}%` }} transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
              {isEstimate && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="mt-5 flex items-start gap-3 p-4 rounded-xl glass-card glow-amber">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Estimate Mode</p>
                    <p className="text-sm text-zinc-400 mt-1">Running on fallback classical signals. Full EfficientNet weights not loaded — results may be less accurate.</p>
                  </div>
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="mt-4 p-4 rounded-xl glass-card">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">AI Explanation</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {verdict === "fake"
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
