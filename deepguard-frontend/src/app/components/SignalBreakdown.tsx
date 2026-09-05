"use client";

import { motion } from "framer-motion";
import { Radar, Activity } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

const SIGNALS = [
  { key: "textureDeficit",        label: "Texture Deficit",       icon: "🧬", color: "#22d3ee", glowClass: "glow-cyan" },
  { key: "frequencyArtifacts",    label: "Frequency Artifacts",   icon: "📡", color: "#a78bfa", glowClass: "glow-violet" },
  { key: "lightingInconsistency", label: "Lighting Inconsistency",icon: "💡", color: "#fbbf24", glowClass: "glow-amber" },
  { key: "biometricAbnormality",  label: "Biometric Abnormality", icon: "💓", color: "#fb7185", glowClass: "glow-rose" },
  { key: "compressionArtifacts",  label: "Compression Artifacts", icon: "📦", color: "#34d399", glowClass: "glow-emerald" },
  { key: "noiseLevel",            label: "Noise Level",           icon: "🌊", color: "#f472b6", glowClass: "glow-rose" },
] as const;

export function SignalBreakdown() {
  const { signals } = useDeepGuard();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
        Forensic Signals
      </h2>

      <div className="glass-card rounded-2xl p-6 glow-border">
        {!signals ? (
          <p className="text-zinc-600 text-center py-8">Upload a video to view forensic signal analysis</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: signal meters */}
            <div className="space-y-4">
              {SIGNALS.map(({ key, label, icon, color, glowClass }, i) => {
                const value = signals[key];
                return (
                  <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="glass-card rounded-xl p-3 hover-lift glow-border group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-300">{icon} {label}</span>
                      <span className="text-sm font-mono font-bold" style={{ color }}>{value.toFixed(1)}%</span>
                    </div>
                    <div className="signal-meter">
                      <motion.div className="signal-meter-fill" style={{ backgroundColor: color }}
                        initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ delay: i * 0.08 + 0.2, duration: 0.9, ease: "easeOut" }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right: corroboration */}
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="glass-card glow-border p-6 rounded-xl text-center hover-lift">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <Radar className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <h3 className="font-bold">Corroboration Score</h3>
                </div>
                <p className="text-6xl font-bold gradient-text">
                  {signals.corroborationScore.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-2">Agreement: neural network ↔ classical signals</p>
                <div className="mt-4 progress-bar">
                  <motion.div className="progress-bar-fill"
                    initial={{ width: 0 }} animate={{ width: `${signals.corroborationScore}%` }} transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }} />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="p-4 rounded-xl glass-card glow-border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">Summary</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {signals.corroborationScore > 80
                    ? "Strong agreement between deep learning model and classical forensic signals — high reliability result."
                    : signals.corroborationScore > 60
                    ? "Moderate agreement. Some signals diverge from the neural network prediction."
                    : "Low corroboration. Consider using full model weights for higher accuracy."}
                </p>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
