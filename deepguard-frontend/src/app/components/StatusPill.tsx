import React from "react";

interface StatusPillProps {
  label: string;
  type: "fake" | "real" | "disputed" | "neutral" | "accent";
}

const TYPE_MAP = {
  fake: "var(--fake)",
  real: "var(--real)",
  disputed: "var(--disputed)",
  neutral: "#71717a", // zinc-500
  accent: "var(--accent)",
};

export function StatusPill({ label, type }: StatusPillProps) {
  const color = TYPE_MAP[type];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
