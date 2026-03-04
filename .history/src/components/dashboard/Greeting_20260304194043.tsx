"use client";

import { useUser } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function Greeting() {
  const { user } = useUser();
  const greeting = getGreeting();
  const firstName = user?.firstName || "there";

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          What would you like to explore today?
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-violet/15 bg-violet/[0.06] px-3 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-light" />
        <span className="text-xs font-semibold text-violet-light">
          Free plan
        </span>
      </div>
    </div>
  );
}
