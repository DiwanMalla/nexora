/**
 * MemoryTab — Handles AI personalization and memory settings.
 *
 * Extracted from AccountSettingsModal.
 */

"use client";

import { Brain, Trash2, Save } from "lucide-react";

interface MemoryTabProps {
  personalization: string;
  onPersonalizationChange: (val: string) => void;
  onClearMemory: () => void;
}

export function MemoryTab({
  personalization,
  onPersonalizationChange,
  onClearMemory,
}: MemoryTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section>
        <div className="mb-4 flex items-end justify-between px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-dim">
              AI Persona & Context
            </h3>
            <p className="mt-1 text-[10px] text-text-muted font-medium uppercase tracking-tight">
              Customize how Nexora responds to you
            </p>
          </div>
        </div>

        <textarea
          value={personalization}
          onChange={(e) => onPersonalizationChange(e.target.value)}
          rows={6}
          className="w-full resize-none rounded-2xl border border-border bg-surface-overlay p-5 text-sm font-medium leading-[var(--leading-relaxed)] text-text outline-none focus:border-violet/40 focus:ring-1 focus:ring-violet/20"
          placeholder="Example: I'm a senior frontend developer who prefers TypeScript and Tailwind CSS. Keep explanations concise."
        />
        <div className="mt-3 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">
          <Save className="h-3 w-3" />
          <span>Auto-saving as you type</span>
        </div>
      </section>

      <div className="h-px w-full bg-border/50" />

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-dim">
            Data Management
          </h3>
          <p className="mt-1 text-[var(--text-xs)] text-text-muted leading-snug">
            Clear short-term memory and contextual metadata across models.
          </p>
        </div>

        <button
          onClick={onClearMemory}
          className="flex w-fit items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500/10 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Memory
        </button>
      </section>
    </div>
  );
}
