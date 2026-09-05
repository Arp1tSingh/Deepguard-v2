"use client";

import { AlertTriangle, Brain } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

export function ReportPanel() {
  const { verdict } = useDeepGuard();

  if (!verdict) return null;

  return (
    <div className="glass-card p-6">
      <div className="space-y-4">
        <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">Model Breakdown</h4>
        {verdict.models.map((model) => {
          const color = MODEL_COLORS[model.key] || "var(--accent)";
          return (
            <div key={model.key} className="flex items-center justify-between p-4 nested-card">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-zinc-200">{MODEL_NAMES[model.key] || model.name}</span>
                {model.verified && <StatusPill label="Verified" type="neutral" />}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ backgroundColor: color, width: `${model.score}%` }} />
                </div>
                <span className="text-sm font-mono font-bold w-12 text-right text-zinc-100">{model.score.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {verdict.agreement !== "high" && (
        <div className="mt-6 flex items-start gap-4 p-4 nested-card border-[var(--disputed)]/30 animate-fade-in" style={{ backgroundColor: "color-mix(in srgb, var(--disputed) 5%, rgba(255,255,255,0.03))" }}>
          <AlertTriangle className="w-5 h-5 text-[var(--disputed)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--disputed)]">{verdict.agreement === "disputed" ? "Disputed Agreement" : "Mixed Agreement"}</p>
            <p className="text-sm text-zinc-300 mt-1">
              The models show varying levels of agreement. A {verdict.agreement} result means the detection confidence should be interpreted with caution.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 nested-card">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-200">AI Explanation</p>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {verdict.label === "fake"
            ? "Multiple forensic markers detected: synthetic blending boundaries, unnatural frequency distribution, and biometric pattern anomalies across the facial region."
            : "No significant manipulation markers found. The video shows consistent natural texture gradients, expected frequency signatures, and authentic biometric patterns."}
        </p>
      </div>
    </div>
  );
}
