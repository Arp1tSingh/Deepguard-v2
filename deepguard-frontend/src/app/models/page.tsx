"use client";

import { DeepGuardProvider } from "../components/DeepGuardProvider";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { StatusPill } from "../components/StatusPill";
import { MODEL_COLORS } from "@/lib/theme";

const MODELS = [
  {
    key: "ucf",
    name: "UCF",
    role: "Best overall accuracy in our eval",
    what: "Disentangles each face into forgery-related and content-related features using dual Xception encoders, then classifies on the forgery signal alone. This separation makes it robust to identity, lighting, and background — it judges the manipulation, not the person.",
    backbone: "Dual Xception encoders + disentanglement blocks",
    caveat: "Its heatmap hooks the forgery encoder via the shared-forgery head, so it is approximate — faithful to the decision, but not a pixel-exact proof.",
  },
  {
    key: "spsl",
    name: "SPSL",
    role: "Best at catching fakes (lowest miss rate) in our eval",
    what: "Fuses the standard RGB image with a frequency phase-spectrum branch: synthetic faces leave telltale traces in phase that survive even when pixels look perfect. The 4-channel input lets it catch fakes other models miss.",
    backbone: "Xception backbone, 4-channel RGB + phase input",
    caveat: "Its heatmap visualizes the RGB branch only, not the phase-spectrum branch — partial explainability, stated openly.",
  },
  {
    key: "xception",
    name: "Xception",
    role: "Conservative baseline (zero false positives in our eval)",
    what: "The classic depthwise-separable CNN from FaceForensics++. A single, well-understood backbone with no extra branches — the easiest architecture to hook cleanly, which is why it drives the Grad-CAM view.",
    backbone: "Single Xception backbone",
    caveat: "Least sensitive of the three by design — it rarely cries wolf, but can miss subtle fakes the others catch.",
  },
];

function HowItWorks() {
  const steps = [
    { n: "01", title: "Sample", body: "Frames are pulled across the full duration — one every 2 seconds — so short and long videos are covered proportionally." },
    { n: "02", title: "Detect", body: "Each frame goes through an SSD face detector with confidence, size, and aspect-ratio gates. Frames with no passing face are skipped openly, never silently analyzed as background." },
    { n: "03", title: "Score", body: "All three models score every valid face independently on CPU, one model at a time. The verdict is the mean; the spread between models becomes the agreement level." },
    { n: "04", title: "Explain", body: "Per-model Grad-CAM heatmaps show which face regions drove each prediction, viewable side-by-side with the original frame." },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {steps.map((s) => (
        <div key={s.n} className="p-4 rounded-lg nested-card">
          <p className="text-xs font-mono text-[var(--accent)] mb-2">{s.n}</p>
          <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function ModelsPage() {
  return (
    <DeepGuardProvider>
      <Header />
      <main className="relative z-10 flex-1 w-full mx-auto pb-12 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <section className="pt-8 pb-10">
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-zinc-100">
              Why these three models
            </h1>
            <p className="text-[16px] text-zinc-400 max-w-2xl leading-relaxed">
              No single detector catches everything. DeepGuard runs three independently-verified
              DeepfakeBench detectors and reports where they agree — and where they don&apos;t.
              A high-confidence verdict with disputed agreement means something different from
              the same confidence with full agreement, and the dashboard shows you both.
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
            {MODELS.map((m) => (
              <div key={m.key} className="glass-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="w-2.5 h-2.5 inline-block rounded-sm"
                    style={{ backgroundColor: MODEL_COLORS[m.key] }}
                  />
                  <h2 className="text-2xl font-bold text-zinc-100">{m.name}</h2>
                </div>
                <div className="mb-4">
                  <StatusPill label="Verified architecture" type="neutral" />
                </div>
                <p className="text-sm font-medium mb-2" style={{ color: MODEL_COLORS[m.key] }}>
                  {m.role}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{m.what}</p>
                <p className="text-xs text-zinc-500 font-mono mb-4">{m.backbone}</p>
                <div className="mt-auto p-4 rounded-lg nested-card">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    <span className="text-zinc-300 font-medium">Caveat: </span>
                    {m.caveat}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <section className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">How a video is analyzed</h2>
            <div className="h-[1px] w-24 bg-[var(--accent)] mb-6" />
          </section>
          <HowItWorks />
        </div>
      </main>
      <Footer />
    </DeepGuardProvider>
  );
}
