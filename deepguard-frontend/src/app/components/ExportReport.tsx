"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Export Report
      </h2>
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Download Analysis Report</p>
              <p className="text-xs text-zinc-500">PDF with verdict, signals, and timeline data</p>
            </div>
          </div>
          <button
            onClick={handleExport} disabled={exporting || !videoId || uploadStatus !== "done"}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? <><Loader2 className="w-5 h-5 animate-spin" />Generating…</> : done ? <><Check className="w-5 h-5" />Exported!</> : <><Download className="w-5 h-5" />Export PDF</>}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Verdict", val: verdict?.label?.toUpperCase() ?? "N/A", cls: verdict?.label === "fake" ? "text-[var(--fake)]" : verdict?.label === "real" ? "text-[var(--real)]" : "text-zinc-500" },
            { label: "Confidence", val: verdict ? `${verdict.confidence.toFixed(1)}%` : "N/A" },
            { label: "Agreement", val: verdict?.agreement ?? "N/A" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="p-4 rounded-xl glass-card text-center">
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${cls || "text-zinc-100"}`}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}