import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DeepGuard - AI-Powered Deepfake Detection",
  description: "Detect deepfakes with explainable AI and forensic signal analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white noise-overlay">
        <div className="gradient-bg min-h-screen fixed inset-0 -z-10" />
        <div className="aurora-blur">
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
          <div className="aurora-blob aurora-blob-3" />
        </div>
        <div className="grid-pattern fixed inset-0 -z-[5] pointer-events-none" />
        {children}
      </body>
    </html>
  );
}