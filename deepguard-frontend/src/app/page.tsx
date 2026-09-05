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
import { useDeepGuard } from "./components/DeepGuardProvider";

function HeroSection() {
  const { verdict } = useDeepGuard();

  return (
    <section id="hero" className="w-full">
      <div className="text-center pt-8 pb-10">
        <h1 className="text-5xl font-bold tracking-tight mb-4 text-[var(--accent)]">
          DeepGuard
        </h1>
        <p className="text-[16px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          AI-powered deepfake detection with explainable Grad-CAM heatmaps and multi-signal forensic analysis.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${verdict ? 'lg:grid-cols-2 gap-8' : 'max-w-3xl mx-auto'} items-stretch`}>
        {verdict && (
          <div className="h-full">
            <CompactVerdict />
          </div>
        )}
        <div className="h-full">
          <Dropzone />
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-zinc-100 mb-2">{title}</h2>
      <div className="h-[1px] w-24 bg-[var(--accent)]" />
    </div>
  );
}

function DashboardContent() {
  const { verdict, uploadStatus } = useDeepGuard();

  if (uploadStatus !== "done" || !verdict) {
    return null;
  }

  return (
    <div className="space-y-16 animate-fade-in content-container">
      <section id="verdict" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <SectionHeader title="Forensic Detailed Analysis" />
        <ReportPanel />
      </section>

      {/* Evidence Inspector gets full-bleed treatments or negative margins on desktop */}
      <section id="evidence" className="w-full border-t border-b border-white/5 bg-[rgba(255,255,255,0.01)] py-16">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-12 w-full">
          <SectionHeader title="Evidence Inspector" />
          <EvidenceInspector />
        </div>
      </section>

      <section id="signals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <SectionHeader title="Forensic Signals" />
        <SignalBreakdown />
      </section>

      <section id="timeline" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <SectionHeader title="Temporal Analysis" />
        <TimelineChart />
      </section>

      <section id="export" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <SectionHeader title="Export Report" />
        <ExportReport />
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <DeepGuardProvider>
      <Header />
      <main className="relative z-10 flex-1 w-full mx-auto pb-12 space-y-16 animate-fade-in">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <HeroSection />
        </div>

        <DashboardContent />

      </main>
      <Footer />
    </DeepGuardProvider>
  );
}
