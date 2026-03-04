"use client";

import Link from "next/link";
import {
  BarChart3,
  Code2,
  FileText,
  Sparkles,
  ArrowRight,
  Monitor,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

type AgentTile = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  badge?: string;
};

const agents: AgentTile[] = [
  {
    href: "/search?agent=researcher",
    label: "Albert Einstein",
    description: "Deep research & creative problem solving",
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "from-amber-500/20 to-amber-600/5",
    badge: "Specialized",
  },
  {
    href: "/search?agent=analyst",
    label: "Market Analyst",
    description: "Real-time trends & data insights",
    icon: BarChart3,
    color: "text-cyan-400",
    bg: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    href: "/search?agent=coder",
    label: "Fullstack Dev",
    description: "System design, debugging & execution",
    icon: Code2,
    color: "text-emerald-400",
    bg: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    href: "/search?agent=ui",
    label: "UI Designer",
    description: "Premium interfaces & visual components",
    icon: Monitor,
    color: "text-fuchsia-400",
    bg: "from-fuchsia-500/20 to-fuchsia-600/5",
  },
  {
    href: "/search?agent=writer",
    label: "Creative Writer",
    description: "Storytelling, copy & scripts",
    icon: FileText,
    color: "text-rose-400",
    bg: "from-rose-500/20 to-rose-600/5",
  },
  {
    href: "/discover",
    label: "Explore More",
    description: "50+ specialized AI agents",
    icon: Sparkles,
    color: "text-violet-400",
    bg: "from-violet-500/20 to-violet-600/5",
  },
];

export function AgentTiles() {
  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white">
            Explore Experts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Specialized agents for complex workflows
          </p>
        </div>
        <Link
          href="/discover"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            focusRing,
          )}
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal scroll grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        {agents.map((agent) => (
          <Link
            key={agent.href}
            href={agent.href}
            className={cn(
              "group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0D0D12] p-6 text-center transition-all duration-300",
              "hover:border-white/15 hover:bg-[#121218] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
              focusRing,
            )}
          >
            {/* Badge */}
            {agent.badge && (
              <span className="absolute right-3 top-3 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                {agent.badge}
              </span>
            )}

            {/* Gradient glow */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                agent.bg,
              )}
            />

            {/* Icon */}
            <div
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-transform duration-300 group-hover:scale-110",
                agent.color,
              )}
            >
              <agent.icon className="h-5 w-5" />
            </div>

            {/* Text */}
            <div className="relative">
              <h3 className="text-sm font-bold text-white">{agent.label}</h3>
              <p className="mt-1 text-[11px] leading-snug text-slate-500 group-hover:text-slate-400">
                {agent.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
