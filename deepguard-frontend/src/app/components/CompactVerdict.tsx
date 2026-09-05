"use client";

import { useDeepGuard } from "./DeepGuardProvider";
import { ShieldCheck, ShieldX } from "lucide-react";
import { StatusPill } from "./StatusPill";

export function CompactVerdict() {
  const { verdict, uploadStatus } = useDeepGuard();

  if (uploadStatus !== "done" || !verdict) return null;

  const isFake = verdict.label === "fake";
  const colorVar = isFake ? "var(--fake)" : "var(--real)";

  return (
    <div
      className="glass-card mb-8 w-full max-w-2xl mx-auto flex items-center justify-between p-6 glow-verdict"
      style={{
        borderColor: `color-mix(in srgb, ${colorVar} 40%, transparent)`,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
            color: colorVar,
          }}
        >
          {isFake ? <ShieldX className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="text-sm text-zinc-400 font-medium">Final Verdict</h2>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ color: colorVar }}
            >
              {verdict.label}
            </span>
            <StatusPill
              label={verdict.agreement.toUpperCase()}
              type={verdict.agreement === "high" ? "real" : verdict.agreement === "mixed" ? "disputed" : "fake"}
            />
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm text-zinc-400 font-medium tracking-wide uppercase">Confidence</p>
        <p className="text-[40px] leading-none font-bold font-mono text-zinc-100">
          {verdict.confidence.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
