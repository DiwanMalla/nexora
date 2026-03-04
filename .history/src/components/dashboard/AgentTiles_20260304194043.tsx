"use client";

import Link from "next/link";
import {
  Search,
  BarChart3,
  Code2,
  MessageCircle,
  FileText,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

type AgentTile = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  badge?: string;
};

const agents: AgentTile[] = [
  {
    href: "/search?agent=researcher",
    label: "Researcher",
    description: "Deep search with citations and fact-checking",
    icon: Search,
    gradient: "from-violet/20 to-violet/5",
    iconColor: "text-violet-light bg-violet/15",
  },
  {
    href: "/search?agent=analyst",
    label: "Analyst",
    description: "Data analysis, CSV parsing, and insights",
    icon: BarChart3,
    gradient: "from-cyan/20 to-cyan/5",
    iconColor: "text-cyan-light bg-cyan/15",
  },
  {
    href: "/search?agent=coder",
    label: "Developer",
    description: "Code generation, debugging, and execution",
    icon: Code2,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400 bg-emerald-500/15",
  },
  {
    href: "/chat",
    label: "AI Chat",
    description: "Multi-model conversations with any AI",
    icon: MessageCircle,
    gradient: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400 bg-amber-500/15",
    badge: "Popular",
  },
  {
    href: "/search?agent=docs",
    label: "AI Docs",
    description: "Generate documents, reports, and summaries",
    icon: FileText,
    gradient: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-400 bg-rose-500/15",
  },
  {
    href: "/discover",
    label: "All Agents",
    description: "Explore the full agent library",
    icon: Sparkles,
    gradient: "from-violet/15 via-cyan/10 to-violet/5",
    iconColor: "text-violet-light bg-gradient-to-br from-violet/20 to-cyan/15",
  },
];

export function AgentTiles() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-white">
          Agents
        </h2>
        <Link
          href="/discover"
          className={cn(
            "flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] transition hover:text-white",
            focusRing,
          )}
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(
          ({
            href,
            label,
            description,
            icon: Icon,
            gradient,
            iconColor,
            badge,
          }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-start gap-3.5 rounded-xl border border-white/[0.06] bg-[var(--bg-card)] p-4 transition-all duration-200",
                "hover:border-white/[0.12] hover:bg-[var(--bg-card-hover)] hover:shadow-lg hover:shadow-black/20",
                focusRing,
              )}
            >
              {/* Gradient accent */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  gradient,
                )}
              />

              <div className="relative">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition",
                    iconColor,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{label}</h3>
                  {badge && (
                    <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-semibold text-violet-light">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
                  {description}
                </p>
              </div>

              <ArrowRight
                className="relative mt-1 h-4 w-4 shrink-0 text-[var(--text-dim)] opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
