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
import { useScrollReveal } from "./hooks/useScrollReveal";

function AnimatedSection({ children, className = "", id, direction = "up" }: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const { ref, isVisible } = useScrollReveal();
  const dirClass = direction === "left" ? "scroll-reveal-left" : direction === "right" ? "scroll-reveal-right" : direction === "scale" ? "scroll-reveal-scale" : "scroll-reveal";

  return (
    <section ref={ref} id={id} className={`${dirClass} ${isVisible ? "visible" : ""} ${className}`}>
      {children}
    </section>
  );
}

export default function Home() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollReveal();

  return (
    <DeepGuardProvider>
      <Header />
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero */}
        <section ref={heroRef} className={`text-center pt-10 scroll-reveal-scale ${heroVisible ? "visible" : ""}`}>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-4 text-[var(--accent)]">
            DeepGuard
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered deepfake detection with explainable Grad-CAM heatmaps and multi-signal forensic analysis.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="#upload" className="btn-primary text-sm">Get Started</a>
            <a href="#evidence" className="btn-secondary text-sm">View Evidence</a>
          </div>
        </section>

        <div className="section-divider" />

        <AnimatedSection id="upload" direction="scale">
          <Dropzone />
        </AnimatedSection>

        <div className="section-divider" />

        <AnimatedSection id="verdict" direction="up">
          <ReportPanel />
        </AnimatedSection>

        <div className="section-divider" />

        <AnimatedSection id="evidence" direction="left">
          <EvidenceInspector />
        </AnimatedSection>

        <div className="section-divider" />

        <AnimatedSection id="signals" direction="right">
          <SignalBreakdown />
        </AnimatedSection>

        <div className="section-divider" />

        <AnimatedSection id="timeline" direction="up">
          <TimelineChart />
        </AnimatedSection>

        <div className="section-divider" />

        <AnimatedSection id="export" direction="scale">
          <ExportReport />
        </AnimatedSection>
      </main>
      <Footer />
    </DeepGuardProvider>
  );
}
