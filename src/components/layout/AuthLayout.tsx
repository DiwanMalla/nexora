"use client";

import Link from "next/link";
import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060608] font-sans selection:bg-violet-500/30 selection:text-white">
      {/* Soft radial glows — no CSS filter:blur (expensive on integrated GPUs) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-16 h-[50vmax] w-[50vmax] opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.28) 0%, transparent 65%)",
          }}
        />
        <div className="aurora-mesh opacity-40" />
        <div className="grain absolute inset-0 opacity-[0.03]" />
      </div>

      {/* ─── Logo (Top Left) ─── */}
      <div className="absolute top-8 left-8 z-50">
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-all hover:opacity-80 active:scale-95"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0 drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]"
          >
            <defs>
              <linearGradient id="auth-logo-grad" x1="0" y1="0" x2="28" y2="28">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <path
              d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z"
              stroke="url(#auth-logo-grad)"
              strokeWidth="2"
              fill="rgba(124,58,237,0.05)"
            />
            <circle cx="14" cy="14" r="4" fill="url(#auth-logo-grad)" />
          </svg>
          <span className="font-display text-2xl font-bold tracking-tight text-white/90">
            Nexora
          </span>
        </Link>
      </div>

      {/* ─── Content ─── */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-700 slide-in-from-bottom-8">
          {children}
        </div>
      </main>

      {/* ─── Footer Links (Optional, matching Kumari) ─── */}
      <div className="absolute bottom-8 left-0 right-0 z-50 flex justify-center gap-6 text-[12px] uppercase tracking-widest text-white/20 font-bold">
        <Link href="/terms" className="hover:text-white/40 transition">
          Terms
        </Link>
        <span className="opacity-50">|</span>
        <Link href="/privacy" className="hover:text-white/40 transition">
          Privacy
        </Link>
      </div>
    </div>
  );
}
