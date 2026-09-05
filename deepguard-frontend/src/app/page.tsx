"use client";

import { DeepGuardProvider } from "./components/DeepGuardProvider";
import { Header } from "./components/Header";
import { Dropzone } from "./components/Dropzone";
import { ReportPanel } from "./components/ReportPanel";
import { EvidenceInspector } from "./components/EvidenceInspector";
import { SignalBreakdown } from "./components/SignalBreakdown";
import { TimelineChart } from "./components/TimelineChart";
import { ExportReport } from "./components/ExportReport";
import { Footer } from "./components/Footer";
import { CompactVerdict } from "./components/CompactVerdict";

export default function Home() {
  return (
    <DeepGuardProvider>
      <Header />
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-16 animate-fade-in">
        {/* Hero */}
        <section className="text-center pt-8 pb-4">
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-[var(--accent)]">
            DeepGuard
          </h1>
          <p className="text-[16px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered deepfake detection with explainable Grad-CAM heatmaps and multi-signal forensic analysis.
          </p>
        </section>

        {/* North-Star Metric (Appears when verdict is ready) */}
        <CompactVerdict />

        <section id="upload">
          <Dropzone />
        </section>

        <section id="verdict">
          <ReportPanel />
        </section>

        <section id="evidence">
          <EvidenceInspector />
        </section>

        <section id="signals">
          <SignalBreakdown />
        </section>

        <section id="timeline">
          <TimelineChart />
        </section>

        <section id="export" className="pb-12">
          <ExportReport />
        </section>
      </main>
      <Footer />
    </DeepGuardProvider>
  );
}
