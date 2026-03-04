"use client";

import { MessageCircle, Search, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCard = {
  label: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  color: string;
};

const stats: StatCard[] = [
  {
    label: "Messages today",
    value: "0",
    subtext: "of 20 free",
    icon: MessageCircle,
    color: "text-violet-light bg-violet/10",
  },
  {
    label: "Agent uses",
    value: "0",
    subtext: "of 5 free",
    icon: Search,
    color: "text-cyan-light bg-cyan/10",
  },
  {
    label: "Streak",
    value: "1",
    subtext: "day",
    icon: Zap,
    color: "text-amber-400 bg-amber-500/10",
  },
];

export function UsageStats() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[var(--text-dim)]" />
        <h3 className="text-sm font-semibold text-white">Usage</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, subtext, icon: Icon, color }) => (
          <div key={label} className="text-center">
            <div
              className={cn(
                "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg",
                color
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="font-display text-xl font-bold text-white">
              {value}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--text-dim)]">
              {subtext}
            </p>
            <p className="text-[10px] text-[var(--text-dim)]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
