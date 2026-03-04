"use client";

import Link from "next/link";
import { Mic, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export function PromoCard() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-violet/15 bg-gradient-to-br from-violet/[0.08] via-[var(--bg-card)] to-cyan/[0.05]">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan/10 blur-2xl" />

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={cn(
          "absolute right-2 top-2 z-10 rounded-md p-1 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
          focusRing,
        )}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex gap-3.5 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/25 to-cyan/15">
          <Mic className="h-5 w-5 text-violet-light" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-white">Voice mode</h3>
            <span className="flex items-center gap-1 rounded-full bg-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan">
              <Sparkles className="h-2.5 w-2.5" />
              New
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
            Turn speech into messages, emails, and docs — 4× faster than typing.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/voice"
              className={cn(
                "rounded-lg bg-violet/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet/20 transition hover:bg-violet",
                focusRing,
              )}
            >
              Try voice mode
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
