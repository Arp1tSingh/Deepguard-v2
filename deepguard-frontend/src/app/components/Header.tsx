"use client";

import { motion } from 'framer-motion';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { useState, useEffect } from "react";
import { useDeepGuard } from "./DeepGuardProvider";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { uploadStatus } = useDeepGuard();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'upload', label: 'Upload' },
    { id: 'verdict', label: 'Verdict' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'signals', label: 'Signals' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled 
            ? 'glass-header py-3 shadow-2xl shadow-black/20' 
            : 'py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="relative w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-[var(--accent)]">
                  DeepGuard
                </h1>
                <p className="text-[10px] text-zinc-500 -mt-1 tracking-wider uppercase">
                  Forensic AI
                </p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item, i) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200"
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>

            {/* Processing indicator */}
            {(uploadStatus === "queued" || uploadStatus === "processing") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-xs text-[var(--accent)] font-medium">Analyzing...</span>
              </motion.div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl glass flex items-center justify-center interactive-card"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={false}
          animate={{ height: mobileMenuOpen ? 'auto' : 0, opacity: mobileMenuOpen ? 1 : 0 }}
          className="lg:hidden overflow-hidden border-t border-white/5"
        >
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>
        </motion.div>
      </header>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}
