/**
 * AppearanceTab — Handles theme and visibility settings.
 *
 * Extracted from AccountSettingsModal to isolate UI logic
 * and reduce the main modal's complexity.
 */

"use client";

import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppearanceTabProps {
  theme: string;
  onThemeChange: (theme: "dark" | "light" | "system") => void;
  showSidebar: boolean;
  onShowSidebarChange: (show: boolean) => void;
  animationsEnabled: boolean;
  onAnimationsEnabledChange: (enabled: boolean) => void;
}

export function AppearanceTab({
  theme,
  onThemeChange,
  showSidebar,
  onShowSidebarChange,
  animationsEnabled,
  onAnimationsEnabledChange,
}: AppearanceTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Theme Selection */}
      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-dim">
          Interface Theme
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", icon: Sun, label: "Light" },
            { id: "dark", icon: Moon, label: "Dark" },
            { id: "system", icon: Monitor, label: "System" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => onThemeChange(option.id as any)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border p-4 transition-all hover:bg-surface-overlay",
                theme === option.id
                  ? "border-violet/40 bg-violet/5 text-text"
                  : "border-border bg-surface-overlay/50 text-text-muted",
              )}
            >
              <option.icon className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="space-y-4">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-dim">
          Layout Preference
        </h3>
        <div className="space-y-3">
          <ToggleRow
            label="Default Sidebar"
            description="Keep the navigation sidebar expanded by default"
            enabled={showSidebar}
            onChange={onShowSidebarChange}
          />
          <ToggleRow
            label="System Animations"
            description="Enable interface transitions and micro-interactions"
            enabled={animationsEnabled}
            onChange={onAnimationsEnabledChange}
          />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-overlay/30 px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-text uppercase tracking-tight">
          {label}
        </span>
        <span className="text-[var(--text-xs)] text-text-dim leading-snug">
          {description}
        </span>
      </div>
      <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="peer h-5 w-9 rounded-full bg-surface-overlay-strong after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-invert after:transition-all after:content-[''] peer-checked:bg-accent-success/80 peer-focus:outline-none peer-checked:after:translate-x-full border border-border" />
      </label>
    </div>
  );
}
