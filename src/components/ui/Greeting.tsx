"use client";

import { Hexagon } from "lucide-react";

export function Greeting() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Brand icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/10 shadow-sm">
        <Hexagon className="h-8 w-8 text-white" />
      </div>

      <h1 className="font-sans text-4xl font-bold tracking-tight text-white sm:text-5xl uppercase tracking-[0.05em]">
        Nexora
      </h1>
      <p className="mt-4 text-text-dim text-sm font-bold uppercase tracking-widest max-w-xs">
        System Operational • Active Node: Diwan Malla
      </p>
    </div>
  );
}
