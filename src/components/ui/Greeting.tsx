"use client";

import { Hexagon } from "lucide-react";

export function Greeting() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Brand icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-cyan/80 shadow-[0_8px_24px_rgba(124,58,237,0.35)]">
        <Hexagon className="h-7 w-7 text-white drop-shadow-sm" />
      </div>

      <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Nexora AI Workspace
      </h1>
    </div>
  );
}
