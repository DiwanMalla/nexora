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
    label: "Messages",
    value: "0",
    subtext: "20 LIMIT",
    icon: MessageCircle,
    color: "text-white bg-white/10",
  },
  {
    label: "Agent Uses",
    value: "0",
    subtext: "5 LIMIT",
    icon: Search,
    color: "text-white bg-white/10",
  },
  {
    label: "Streak",
    value: "1",
    subtext: "DAY",
    icon: Zap,
    color: "text-white bg-white/10",
  },
];

export function UsageStats() {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">Compute Usage</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, subtext, icon: Icon, color }) => (
          <div key={label} className="text-left flex flex-col gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded border border-white/5",
                color,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {value}
              </p>
              <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">
                {subtext}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
