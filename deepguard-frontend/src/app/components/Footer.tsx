import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--accent)]">DeepGuard</span>
              <span className="text-zinc-600 text-xs ml-2 font-mono">v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono">
            <span>© {new Date().getFullYear()} DeepGuard</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Forensic AI Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
