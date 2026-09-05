"use client";

import { Radar, Activity } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

export function SignalBreakdown() {
  const { signals } = useDeepGuard();

  if (!signals) return null;

  return (
    <div className="glass-card p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: per-model bars */}
        <div className="space-y-4">
          {signals.models.map((model) => {
            const modelKey = model.name.toLowerCase();
            const color = MODEL_COLORS[modelKey] || "var(--accent)";
            const name = MODEL_NAMES[modelKey] || model.name;
            return (
              <div key={model.name} className="p-4 nested-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-200">{name}</span>
                  <span className="text-sm font-mono font-bold text-zinc-100">{model.score.toFixed(1)}%</span>
                </div>
                <div className="signal-meter">
                  <div className="signal-meter-fill transition-all duration-500 ease-out" style={{ backgroundColor: color, width: `${model.score}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: agreement + spread */}
        <div className="space-y-4">
          <div className="p-6 nested-card text-center flex flex-col items-center justify-center h-[calc(50%-8px)]">
            <div className="flex items-center gap-2 mb-3">
              <Radar className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Agreement Level</h3>
            </div>
            <StatusPill 
              label={signals.agreement.toUpperCase()} 
              type={signals.agreement === "high" ? "real" : signals.agreement === "mixed" ? "disputed" : "fake"} 
            />
          </div>

          <div className="p-6 nested-card text-center flex flex-col items-center justify-center h-[calc(50%-8px)]">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Agreement Spread</h3>
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-100 mb-3">{signals.agreement_spread.toFixed(1)}%</p>
            <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--real)] via-[var(--disputed)] to-[var(--fake)] transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, signals.agreement_spread * 5)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
