"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Check, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

export function ExportReport() {
  const { verdict, confidence, signals, isEstimate } = useDeepGuard();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const m = 20;
      const pw = doc.internal.pageSize.getWidth();
      let y = m;

      doc.setFontSize(22); doc.setTextColor(34, 211, 238);
      doc.text("DeepGuard Analysis Report", m, y); y += 10;
      doc.setFontSize(9); doc.setTextColor(140);
      doc.text(`Generated: ${new Date().toLocaleString()}`, m, y); y += 5;
      doc.text("DeepGuard v1.0 — AI-Powered Deepfake Detection", m, y); y += 14;
      doc.setDrawColor(60); doc.line(m, y, pw - m, y); y += 12;

      doc.setFontSize(14); doc.setTextColor(240);
      doc.text("Verdict", m, y); y += 8;
      doc.setFontSize(28);
      doc.setTextColor(verdict === "fake" ? 251 : 52, verdict === "fake" ? 113 : 211, verdict === "fake" ? 133 : 153);
      doc.text(verdict ? verdict.toUpperCase() : "N/A", m, y); y += 12;
      doc.setFontSize(12); doc.setTextColor(180);
      doc.text(`Confidence: ${confidence.toFixed(1)}%`, m, y); y += 7;
      if (isEstimate) { doc.setTextColor(251, 191, 36); doc.text("⚠  Estimate mode — full model weights not loaded", m, y); y += 7; }
      y += 5;

      if (signals) {
        doc.setFontSize(14); doc.setTextColor(240);
        doc.text("Forensic Signal Breakdown", m, y); y += 8;
        const rows = [
          ["Texture Deficit", signals.textureDeficit],
          ["Frequency Artifacts", signals.frequencyArtifacts],
          ["Lighting Inconsistency", signals.lightingInconsistency],
          ["Biometric Abnormality", signals.biometricAbnormality],
          ["Compression Artifacts", signals.compressionArtifacts],
          ["Noise Level", signals.noiseLevel],
        ] as [string, number][];
        doc.setFontSize(10);
        rows.forEach(([label, val]) => {
          doc.setTextColor(200); doc.text(`${label}: ${val.toFixed(1)}%`, m + 4, y);
          doc.setFillColor(40, 40, 40); doc.rect(m + 70, y - 4, 80, 5, "F");
          doc.setFillColor(34, 211, 238); doc.rect(m + 70, y - 4, (80 * val) / 100, 5, "F");
          y += 9;
        });
        y += 4;
        doc.setFontSize(12); doc.setTextColor(240);
        doc.text(`Corroboration Score: ${signals.corroborationScore.toFixed(1)}%`, m, y); y += 14;
      }

      const ph = doc.internal.pageSize.getHeight();
      doc.setDrawColor(60); doc.line(m, ph - 16, pw - m, ph - 16);
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text("DeepGuard — For forensic purposes only.", m, ph - 9);
      doc.save("deepguard-report.pdf");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" />
        Export Report
      </h2>
      <div className="glass-card rounded-2xl p-6 glow-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center hover-lift">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="font-medium">Download Analysis Report</p>
              <p className="text-xs text-zinc-500">PDF with verdict, signals, and timeline data</p>
            </div>
          </div>
          <motion.button whileHover={!exporting ? { scale: 1.03 } : {}} whileTap={!exporting ? { scale: 0.97 } : {}}
            onClick={handleExport} disabled={exporting || !verdict}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              exporting || !verdict
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "btn-primary"
            }`}>
            {exporting ? <><Loader2 className="w-5 h-5 animate-spin" />Generating…</> : done ? <><Check className="w-5 h-5" />Exported!</> : <><Download className="w-5 h-5" />Export PDF</>}
          </motion.button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Verdict", val: verdict?.toUpperCase() ?? "N/A", cls: verdict === "fake" ? "text-rose-400" : verdict === "real" ? "text-emerald-400" : "text-zinc-500" },
            { label: "Confidence", val: confidence ? `${confidence.toFixed(1)}%` : "N/A", cls: "text-cyan-400" },
            { label: "Signals", val: signals ? "6 / 6" : "0 / 6", cls: "text-violet-400" },
          ].map(({ label, val, cls }) => (
            <motion.div key={label} whileHover={{ y: -4 }} className="p-4 rounded-xl glass-card glow-border text-center cursor-default">
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${cls}`}>{val}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
