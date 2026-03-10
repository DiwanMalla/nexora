"use client";

import Link from "next/link";
import {
  BarChart3,
  Code2,
  FileText,
  Sparkles,
  Monitor,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/styles";

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
    color: "text-white",
    bg: "bg-white/[0.04]",
    badge: "Core",
  },
  {
    href: "/search?agent=analyst",
    label: "Market Analyst",
    description: "Real-time trends & data insights",
    icon: BarChart3,
    color: "text-white",
    bg: "bg-white/[0.04]",
  },
  {
    href: "/search?agent=coder",
    label: "Fullstack Dev",
    description: "System design, debugging & execution",
    icon: Code2,
    color: "text-white",
    bg: "bg-white/[0.04]",
  },
  {
    href: "/search?agent=ui",
    label: "UI Designer",
    description: "Premium interfaces & visual components",
    icon: Monitor,
    color: "text-white",
    bg: "bg-white/[0.04]",
  },
  {
    href: "/search?agent=writer",
    label: "Creative Writer",
    description: "Storytelling, copy & scripts",
    icon: FileText,
    color: "text-white",
    bg: "bg-white/[0.04]",
  },
  {
    href: "/discover",
    label: "Explore More",
    description: "50+ specialized AI agents",
    icon: Sparkles,
    color: "text-white",
    bg: "bg-white/[0.04]",
  },
];

export function AgentTiles() {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-sans text-[13px] font-bold tracking-[0.15em] text-white uppercase">
            Active Experts
          </h2>
          <p className="mt-1 text-[11px] font-medium text-text-dim uppercase tracking-wider">
            Enterprise Compute Nodes
          </p>
        </div>
      </div>

      {/* Horizontal scroll grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        {agents.map((agent) => (
          <Link
            key={agent.href}
            href={agent.href}
            className={cn(
              "group relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center transition-all duration-300",
              "hover:border-white/10 hover:bg-white/[0.04]",
              FOCUS_RING,
            )}
          >
            {/* Badge */}
            {agent.badge && (
              <span className="absolute right-3 top-3 rounded bg-white text-black px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest">
                {agent.badge}
              </span>
            )}

            {/* Icon */}
            <div
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] transition-transform duration-300 group-hover:scale-105",
                "text-white",
              )}
            >
              <agent.icon className="h-4 w-4" />
            </div>

            {/* Text */}
            <div className="relative">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">{agent.label}</h3>
              <p className="mt-1 text-[10px] leading-snug text-text-dim group-hover:text-white transition-colors uppercase tracking-tight">
                {agent.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
