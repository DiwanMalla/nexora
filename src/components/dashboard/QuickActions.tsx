"use client";

import Link from "next/link";
import {
  Bot as BotIcon,
  Search,
  Code2,
  FileText,
  Image,
  Video,
  Music,
  BarChart3,
  Mail,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/styles";

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
  badge?: string;
};

const actions: QuickAction[] = [
  {
    href: "/search?agent=researcher",
    label: "AI Search",
    icon: Search,
    color: "bg-violet/15 text-violet-light border-violet/25",
  },
  {
    href: "/chat",
    label: "AI Chat",
    icon: BotIcon,
    color: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    badge: "Unlimited",
  },
  {
    href: "/search?agent=coder",
    label: "AI Developer",
    icon: Code2,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  {
    href: "/search?agent=analyst",
    label: "AI Analyst",
    icon: BarChart3,
    color: "bg-cyan/15 text-cyan-light border-cyan/25",
  },
  {
    href: "/search?agent=docs",
    label: "AI Docs",
    icon: FileText,
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  },
  {
    href: "/image",
    label: "AI Image",
    icon: Image,
    color: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
    badge: "New",
  },
  {
    href: "/video",
    label: "AI Video",
    icon: Video,
    color: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  },
  {
    href: "/music",
    label: "AI Music",
    icon: Music,
    color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  },
  {
    href: "/email",
    label: "AI Email",
    icon: Mail,
    color: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  },
  {
    href: "/discover",
    label: "All Agents",
    icon: Sparkles,
    color: "bg-white/[0.06] text-white/60 border-white/10",
  },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-6 sm:gap-x-10">
      {actions.map(({ href, label, icon: Icon, color, badge }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group relative flex w-[72px] flex-col items-center gap-2.5 transition-all duration-300",
            FOCUS_RING,
          )}
        >
          {/* Badge */}
          {badge && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
              {badge}
            </span>
          )}

          {/* Circular icon */}
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300",
              "group-hover:scale-110 group-hover:shadow-lg",
              color,
            )}
          >
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>

          {/* Label */}
          <span className="text-center text-[11px] font-semibold leading-tight text-slate-500 transition-colors group-hover:text-white">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
