"use client";

import Link from "next/link";
import { MessageCircle, Search, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

type RecentItem = {
  id: string;
  title: string;
  type: "chat" | "search";
  time: string;
  model?: string;
};

// Placeholder data — will be replaced with real Supabase data
const recentItems: RecentItem[] = [
  {
    id: "1",
    title: "Compare React frameworks for 2026",
    type: "search",
    time: "2h ago",
    model: "claude-3.5-sonnet",
  },
  {
    id: "2",
    title: "Draft product launch email",
    type: "chat",
    time: "5h ago",
    model: "gpt-4o",
  },
  {
    id: "3",
    title: "Analyze Q4 revenue data",
    type: "search",
    time: "Yesterday",
    model: "claude-3.5-sonnet",
  },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--text-dim)]" />
          <h3 className="text-sm font-semibold text-white">Recent</h3>
        </div>
        <Link
          href="/workspace/history"
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] transition hover:text-white",
            focusRing,
          )}
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {recentItems.map((item) => (
          <Link
            key={item.id}
            href={
              item.type === "chat" ? `/chat/${item.id}` : `/search/${item.id}`
            }
            className={cn(
              "group flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02]",
              focusRing,
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                item.type === "chat"
                  ? "bg-violet/10 text-violet-light"
                  : "bg-cyan/10 text-cyan-light",
              )}
            >
              {item.type === "chat" ? (
                <MessageCircle className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/90 group-hover:text-white">
                {item.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                {item.model && (
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">
                    {item.model}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-dim)]">
                  {item.time}
                </span>
              </div>
            </div>

            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-dim)] opacity-0 transition group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {recentItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-[var(--text-dim)]" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            No conversations yet
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">
            Start by asking a question above
          </p>
        </div>
      )}
    </div>
  );
}
