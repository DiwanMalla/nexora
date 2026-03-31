/**
 * AIPreferencesTab — Handles AI provider activation and model selection.
 *
 * Extracted from AccountSettingsModal.
 * Consolidates AI provider settings and multi-chat (consensus) preferences.
 */

"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS, getModelsByProvider } from "@/lib/ai-providers";
import type { AIProvider } from "@/lib/ai-providers";
import { AI_CHAT_CONSENSUS_ENABLED } from "@/lib/constants";

interface AIProviderPref {
  enabled: boolean;
  modelId: string;
}

interface AIPreferencesTabProps {
  prefs: Record<string, AIProviderPref>;
  onProviderPrefChange: (id: string, update: Partial<AIProviderPref>) => void;
  competingModelIds: string[];
  onToggleCompetingModel: (id: string) => void;
}

export function AIPreferencesTab({
  prefs,
  onProviderPrefChange,
  competingModelIds,
  onToggleCompetingModel,
}: AIPreferencesTabProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  /** Models that are eligible for competing mode (consensus chat). */
  const competingModels = AI_PROVIDERS.filter((p) => p.isDefault)
    .flatMap((p) => getModelsByProvider(p.id))
    .filter((m) => m.apiId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Provider List */}
      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-dim">
          Connected AI Engines
        </h3>
        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => {
            const hasPrefs = prefs[provider.id] || { enabled: false, modelId: "" };
            const isExpanded = expandedProvider === provider.id;

            return (
              <ProviderRow
                key={provider.id}
                provider={provider}
                enabled={hasPrefs.enabled}
                onEnabledChange={(enabled) =>
                  onProviderPrefChange(provider.id, { enabled })
                }
                selectedModelId={hasPrefs.modelId}
                onModelChange={(modelId) =>
                  onProviderPrefChange(provider.id, { modelId })
                }
                isExpanded={isExpanded}
                onToggleExpand={() =>
                  setExpandedProvider(isExpanded ? null : provider.id)
                }
              />
            );
          })}
        </div>
      </section>

      {/* Multi-Chat Consensus — paused until single + compare are stable */}
      {AI_CHAT_CONSENSUS_ENABLED ? (
        <section className="rounded-[2rem] border border-violet/20 bg-violet/5 p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-text uppercase tracking-tight">
              Multi-Chat Consensus
            </h3>
            <p className="mt-1 text-[var(--text-xs)] text-text-muted leading-relaxed">
              Select 2 or more models to run in parallel. Nexora will synthesize
              the best answer from their combined intelligence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {competingModels.map((m) => {
              if (!m.apiId) return null;
              const isSelected = competingModelIds.includes(m.apiId);

              return (
                <button
                  key={m.apiId}
                  onClick={() => m.apiId && onToggleCompetingModel(m.apiId)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all",
                    isSelected
                      ? "border-violet/40 bg-violet/10 text-text"
                      : "border-border bg-surface-overlay/50 text-text-muted hover:border-border-hover",
                  )}
                >
                  <span className="truncate text-[11px] font-bold uppercase tracking-tight">
                    {m.name}
                  </span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-violet-light shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-border bg-surface-overlay/30 p-6">
          <h3 className="text-sm font-bold text-text uppercase tracking-tight">
            Multi-Chat Consensus
          </h3>
          <p className="mt-2 text-[var(--text-xs)] text-text-muted leading-relaxed">
            Temporarily unavailable while we stabilize single-model answers and
            live verification. Use{" "}
            <span className="font-semibold text-text">Multi</span> in the chat
            bar for side-by-side compare. Consensus will return in a later
            release.
          </p>
        </section>
      )}
    </div>
  );
}

function ProviderRow({
  provider,
  enabled,
  onEnabledChange,
  selectedModelId,
  onModelChange,
  isExpanded,
  onToggleExpand,
}: {
  provider: AIProvider;
  enabled: boolean;
  onEnabledChange: (val: boolean) => void;
  selectedModelId: string;
  onModelChange: (val: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const models = getModelsByProvider(provider.id);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-all duration-300",
        enabled ? "border-border" : "border-border/40 opacity-70",
      )}
    >
      <div className="flex items-center gap-4 bg-surface-overlay p-4">
        {/* Logo */}
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border text-[13px] font-black transition-all",
            provider.accent,
          )}
        >
          {provider.logo || provider.name[0]}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h4 className="text-sm font-bold text-text uppercase tracking-wider">
            {provider.name}
          </h4>
          <p className="text-[10px] text-text-muted uppercase tracking-tight">
            {enabled ? "Connected & Active" : "Disabled"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {enabled && (
            <button
              onClick={onToggleExpand}
              className="rounded-lg p-2 text-text-dim hover:bg-surface-overlay-strong"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center ml-2">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
            />
            <div className="peer h-5 w-9 rounded-full bg-surface-overlay-strong after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-invert after:transition-all after:content-[''] peer-checked:bg-accent-success peer-focus:outline-none peer-checked:after:translate-x-full border border-border" />
          </label>
        </div>
      </div>

      {/* Model Selection (Expanded) */}
      {isExpanded && enabled && (
        <div className="border-t border-border bg-surface-overlay/50 p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 gap-2">
            {models.map((m) => (
              <button
                key={m.apiId || m.name}
                onClick={() => m.apiId && onModelChange(m.apiId)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all",
                  selectedModelId === m.apiId
                    ? "bg-violet text-white shadow-lg"
                    : "text-text-muted hover:bg-surface-overlay-strong hover:text-text",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold uppercase tracking-tight">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-current opacity-70 uppercase tracking-tighter">
                    {m.keyAdvantage}
                  </span>
                </div>
                {selectedModelId === m.apiId && (
                  <Check className="h-4 w-4 stroke-[3px]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
