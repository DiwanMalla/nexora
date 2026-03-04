"use client";

import {
  Mail,
  Calendar,
  FolderOpen,
  MessageSquare,
  Plus,
  type LucideIcon,
} from "lucide-react";
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
    <div className="rounded-2xl border border-white/10 bg-[#0E0E12] p-5 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Integrations</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400">
          4
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {integrations.map(({ name, icon: Icon, connected }) => (
          <button
            key={name}
            type="button"
            className={cn(
              "group flex h-12 items-center justify-center rounded-xl border transition-all duration-300",
              connected
                ? "border-violet/30 bg-violet/10 text-violet-light shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                : "border-white/5 bg-[#16161E] text-slate-500 hover:border-white/20 hover:text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_rgba(255,255,255,0.05)]",
              focusRing,
            )}
            title={connected ? `${name} (connected)` : `Connect ${name}`}
            aria-label={connected ? `${name} connected` : `Connect ${name}`}
          >
            <Icon className="h-5 w-5 transition group-hover:scale-110" />
          </button>
        ))}
      </div>
    </div>
  );
}
