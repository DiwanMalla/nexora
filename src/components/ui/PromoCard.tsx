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
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={cn(
          "absolute right-2 top-2 z-10 rounded-md p-1 text-text-dim transition hover:bg-white/5 hover:text-white",
          focusRing,
        )}
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="relative flex gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
          <Mic className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">Advanced Input</h3>
            <span className="flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[8px] font-black text-black tracking-widest leading-none">
              PRO
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-text-dim uppercase tracking-wider">
            Voice serialization enabled. 4× throughput improvement.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/voice"
              className={cn(
                "rounded-lg bg-white px-4 py-2 text-[10px] font-bold text-black uppercase tracking-widest hover:bg-gray-200 transition-all",
                focusRing,
              )}
            >
              Initialize Voice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
