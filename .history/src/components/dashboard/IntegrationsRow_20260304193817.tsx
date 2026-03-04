"use client";

import { Mail, Calendar, FolderOpen, MessageSquare, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

type Integration = {
  name: string;
  icon: LucideIcon;
  connected: boolean;
};

const integrations: Integration[] = [
  { name: "Gmail", icon: Mail, connected: false },
  { name: "Calendar", icon: Calendar, connected: false },
  { name: "Drive", icon: FolderOpen, connected: false },
  { name: "Teams", icon: MessageSquare, connected: false },
];

export function IntegrationsRow() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Integrations</h3>
        <span className="text-[11px] text-[var(--text-dim)]">
          Connect your tools
        </span>
      </div>
      <div className="flex items-center gap-2">
        {integrations.map(({ name, icon: Icon, connected }) => (
          <button
            key={name}
            type="button"
            className={cn(
              "group flex h-11 w-11 items-center justify-center rounded-xl border transition",
              connected
                ? "border-violet/25 bg-violet/10 text-violet-light"
                : "border-white/[0.06] bg-white/[0.03] text-[var(--text-dim)] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white",
              focusRing
            )}
            title={connected ? `${name} (connected)` : `Connect ${name}`}
            aria-label={connected ? `${name} connected` : `Connect ${name}`}
          >
            <Icon className="h-[18px] w-[18px] transition group-hover:scale-105" />
          </button>
        ))}
        <button
          type="button"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-[var(--text-dim)] transition hover:border-violet/20 hover:text-violet-light",
            focusRing
          )}
          aria-label="Add integration"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
