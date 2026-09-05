"use client";

import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center glow-cyan">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold gradient-text">DeepGuard</span>
              <span className="text-zinc-600 text-xs ml-2">v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>© {new Date().getFullYear()} DeepGuard</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Forensic AI Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
