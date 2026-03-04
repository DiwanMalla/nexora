"use client";

import Link from "next/link";
import { ChevronLeft, Menu, Pencil, Share2, Link2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

interface ChatHeaderProps {
  title: string;
  onTitleChange?: (title: string) => void;
  onBackHref: string;
  showBack?: boolean;
  agentTypeLabel?: string;
}

export function ChatHeader({
  title,
  onTitleChange,
  onBackHref,
  showBack = true,
  agentTypeLabel = "AI Chat",
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[var(--bg)]/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {showBack && (
          <Link
            href={onBackHref}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
              focusRing,
            )}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            focusRing,
          )}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold text-white">
            {title || agentTypeLabel}
          </span>
          {onTitleChange && (
            <button
              type="button"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300",
                focusRing,
              )}
              aria-label="Edit chat title"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            focusRing,
          )}
        >
          Share
        </button>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            focusRing,
          )}
          aria-label="Copy link"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            focusRing,
          )}
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
