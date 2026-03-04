"use client";

import Link from "next/link";
import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060608] font-sans selection:bg-violet-500/30 selection:text-white">
      {/* ─── Aurora / Glow Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main center glow - Violet */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-[140px]"
          style={{
            background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
          }}
        />

        {/* Secondary cyan glow */}
        <div
          className="absolute -bottom-40 -left-20 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{
            background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
          }}
        />

        {/* Aurora mesh from globals.css */}
        <div className="aurora-mesh opacity-40" />

        {/* Grain texture */}
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
