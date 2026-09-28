"use client";

import { AlertTriangle, Brain, Crosshair } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import type { ExplanationData } from "./DeepGuardProvider";
import { MODEL_COLORS, MODEL_NAMES } from "@/lib/theme";
import { StatusPill } from "./StatusPill";

function WhyVerdict({ explanation, onFrameClick }: {
  explanation: ExplanationData;
  onFrameClick: (index: number) => void;
}) {
  const { summary, models, key_frames, trend, spread_detail, caveats } = explanation;
  const skippedNote = summary.frames_skipped > 0
    ? ` ${summary.frames_skipped} sampled frame${summary.frames_skipped === 1 ? " was" : "s were"} skipped (no face detected) and excluded from every number below.`
    : "";

  return (
    <div className="mt-6 p-4 nested-card">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-200">Why this verdict</p>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        {`Verdict ${summary.label.toUpperCase()} at ${summary.confidence.toFixed(1)}% confidence — the mean of ${models.length} models over ${summary.frames_analyzed} analyzed frame${summary.frames_analyzed === 1 ? "" : "s"}.${skippedNote}`}
      </p>

      <div className="mt-3 space-y-2">
        {models.map((m) => (
          <p key={m.key} className="text-xs text-zinc-400 leading-relaxed">
            <span className="font-medium" style={{ color: MODEL_COLORS[m.key] }}>
              {MODEL_NAMES[m.key] ?? m.key}
            </span>
            {` scored ${m.score.toFixed(1)}%${m.std > 0 ? ` (±${m.std.toFixed(1)} across frames)` : ""}. `}
            {m.faithfulness_drop !== null && m.faithfulness_frame !== null && (
              m.faithfulness_drop > 0
                ? `Masking its highlighted region moved this prediction by ${m.faithfulness_drop.toFixed(1)} pts, so the heatmap marks decision-driving pixels.`
                : `Masking its highlighted region did not move this prediction — treat its heatmap with caution.`
            )}
          </p>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
        {`Fake probability is ${trend.direction} across the video (${trend.first_half.toFixed(1)}% early → ${trend.second_half.toFixed(1)}% late). `}
        {spread_detail.spread > 0 && (
          `Models disagree by ${spread_detail.spread.toFixed(1)} pts, driven by ${(MODEL_NAMES[spread_detail.outlier_key] ?? spread_detail.outlier_key)} at ${spread_detail.outlier_score.toFixed(1)}%.`
        )}
      </p>

      {key_frames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {key_frames.map((kf) => (
            <button
              key={kf.index}
              onClick={() => onFrameClick(kf.index)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:text-white transition-colors"
              title={`Inspect frame ${kf.index} in Evidence Inspector`}
            >
              <Crosshair className="w-3 h-3" />
              {kf.timestamp} · {kf.score.toFixed(1)}%
            </button>
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {caveats.map((c, i) => (
          <li key={i} className="text-[11px] text-zinc-600 leading-relaxed">• {c}</li>
        ))}
      </ul>
    </div>
  );
}

export function ReportPanel() {
  const { verdict, explanation, setFocusFrame } = useDeepGuard();

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

      {explanation ? (
        <WhyVerdict explanation={explanation} onFrameClick={setFocusFrame} />
      ) : (
        <div className="mt-6 p-4 nested-card">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-200">Why this verdict</p>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Detailed explanation is still loading.
          </p>
        </div>
      )}
    </div>
  );
}
