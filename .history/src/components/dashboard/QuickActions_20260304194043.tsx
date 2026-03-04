"use client";

import Link from "next/link";
import {
  MessageCircle,
  Search,
  Upload,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

const actions: QuickAction[] = [
  {
    href: "/chat",
    label: "New chat",
    icon: MessageCircle,
    color: "text-violet-light bg-violet/15 group-hover:bg-violet/25",
  },
  {
    href: "/search",
    label: "Research",
    icon: Search,
    color: "text-cyan-light bg-cyan/15 group-hover:bg-cyan/25",
  },
  {
    href: "/drive?upload=1",
    label: "Upload",
    icon: Upload,
    color: "text-emerald-400 bg-emerald-500/15 group-hover:bg-emerald-500/25",
  },
  {
    href: "/search?agent=docs",
    label: "Write doc",
    icon: FileText,
    color: "text-amber-400 bg-amber-500/15 group-hover:bg-amber-500/25",
  },
];

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      {actions.map(({ href, label, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[var(--bg-card)] px-3.5 py-2.5 transition-all duration-200",
            "hover:border-white/[0.12] hover:bg-[var(--bg-card-hover)] hover:shadow-lg hover:shadow-black/20",
            focusRing,
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition",
              color,
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)] transition group-hover:text-white">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
