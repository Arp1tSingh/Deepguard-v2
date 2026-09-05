"use client";

import { useState, useCallback } from "react";
import { Download, FileText, Check, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";
import { api } from "@/lib/deepguard-api";

export function ExportReport() {
  const { verdict, videoId, uploadStatus } = useDeepGuard();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = useCallback(async () => {
    if (!videoId) return;
    setExporting(true);
    setDone(false);
    try {
      const blob = await api.exportPDF(videoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deepguard_report_${videoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [videoId]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Export Report
      </h2>
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Download Analysis Report</p>
              <p className="text-xs text-zinc-500 mt-0.5">PDF with verdict, signals, and timeline data</p>
            </div>
          </div>
          <button
            onClick={handleExport} disabled={exporting || !videoId || uploadStatus !== "done"}
            className="btn-secondary flex items-center gap-2 w-full sm:w-auto"
          >
            {exporting ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : done ? <><Check className="w-4 h-4" />Exported</> : <><Download className="w-4 h-4" />Export PDF</>}
          </button>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Verdict", val: verdict?.label?.toUpperCase() ?? "--", cls: verdict?.label === "fake" ? "text-[var(--fake)]" : verdict?.label === "real" ? "text-[var(--real)]" : "text-zinc-500" },
            { label: "Confidence", val: verdict ? `${verdict.confidence.toFixed(1)}%` : "--", cls: "text-zinc-100" },
            { label: "Agreement", val: verdict?.agreement ? verdict.agreement.charAt(0).toUpperCase() + verdict.agreement.slice(1) : "--", cls: "text-zinc-100" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="p-4 rounded-lg bg-[rgba(255,255,255,0.015)] border border-white/5">
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold font-mono ${cls}`}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}