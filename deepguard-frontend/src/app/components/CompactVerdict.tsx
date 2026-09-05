"use client";

import { useDeepGuard } from "./DeepGuardProvider";
import { ShieldCheck, ShieldX } from "lucide-react";
import { StatusPill } from "./StatusPill";

export function CompactVerdict() {
  const { verdict, uploadStatus } = useDeepGuard();

  if (uploadStatus !== "done" || !verdict) return null;

  const isFake = verdict.label === "fake";
  const colorVar = isFake ? "var(--fake)" : "var(--real)";

  const circumference = 2 * Math.PI * 40; // r=40
  const offset = circumference - (verdict.confidence / 100) * circumference;

  return (
    <div
      className="glass-card w-full flex flex-col sm:flex-row items-center justify-between p-6 h-full"
      style={{
        borderLeft: `6px solid ${colorVar}`,
        backgroundColor: `color-mix(in srgb, ${colorVar} 5%, rgba(255,255,255,0.02))`,
      }}
    >
      <div className="flex items-center gap-6">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
            color: colorVar,
          }}
        >
          {isFake ? <ShieldX className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
        </div>
        <div>
          <h2 className="text-sm text-zinc-400 font-medium font-display uppercase tracking-widest">Final Verdict</h2>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-4xl font-bold uppercase tracking-tight font-display"
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

      <div className="relative w-28 h-28 shrink-0 mt-6 sm:mt-0 flex items-center justify-center">
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          {/* Background Ring */}
          <circle
            cx="56"
            cy="56"
            r="40"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="none"
          />
          {/* Foreground Ring */}
          <circle
            cx="56"
            cy="56"
            r="40"
            stroke={colorVar}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.8s ease-out",
              filter: `drop-shadow(0 0 8px color-mix(in srgb, ${colorVar} 40%, transparent))`
            }}
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 text-center">
          <span className="text-3xl leading-none font-bold font-mono text-zinc-100 mt-1">
            {verdict.confidence.toFixed(0)}<span className="text-base text-zinc-500 ml-0.5">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
