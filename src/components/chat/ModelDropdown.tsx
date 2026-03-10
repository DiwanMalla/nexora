/**
 * ModelDropdown — Model selection picker for the CommandBar.
 *
 * Extracted from CommandBar to reduce its size and isolate the
 * provider-grouped model selection logic.
 */

"use client";

import { useMemo, useCallback } from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import { AVAILABLE_MODELS } from "@/lib/constants";
import {
  AI_PROVIDERS,
  getProviderGroups,
  getModelsByProvider,
  getModelNameByApiId,
} from "@/lib/ai-providers";

interface ModelDropdownProps {
  /** Currently selected model API ID. */
  selectedModel: string;
  /** Called when the user picks a model. */
  onSelectModel: (modelApiId: string) => void;
  /** Whether the dropdown is currently open. */
  isOpen: boolean;
  /** Toggle the dropdown open/closed. */
  onToggle: () => void;
  /** Close the dropdown. */
  onClose: () => void;
}

export function ModelDropdown({
  selectedModel,
  onSelectModel,
  isOpen,
  onToggle,
  onClose,
}: ModelDropdownProps) {
  const dropdownRef = useClickOutside<HTMLDivElement>(onClose, isOpen);

  const availableModelIds = useMemo(
    () => new Set(AVAILABLE_MODELS.map((m) => m.id)),
    [],
  );

  const providersWithModels = useMemo(
    () =>
      AI_PROVIDERS.filter((p) =>
        getModelsByProvider(p.id).some(
          (m) => m.apiId && availableModelIds.has(m.apiId),
        ),
      ),
    [availableModelIds],
  );

  const selectedModelLabel =
    getModelNameByApiId(selectedModel) ??
    AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name ??
    "Select Model";

  const handleSelect = useCallback(
    (apiId: string) => {
      onSelectModel(apiId);
      onClose();
    },
    [onSelectModel, onClose],
  );

  /** Shared button classes for a model option row. */
  const modelOptionClass = (apiId: string | undefined) =>
    cn(
      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--text-sm)] font-medium transition-colors",
      apiId === selectedModel
        ? "bg-surface-overlay-strong text-text"
        : "text-text-muted hover:bg-surface-overlay hover:text-text",
    );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-full bg-surface-overlay pl-2 pr-1.5 py-1 border border-border hover:bg-surface-overlay-strong transition-colors"
      >
        <Cpu className="h-3 w-3 text-violet-400" />
        <span className="text-[var(--text-xs)] font-semibold text-white">
          {selectedModelLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-text-muted transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 min-w-[220px] max-w-[280px] z-[100] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
            {providersWithModels.map((provider) => {
              const groups = getProviderGroups(provider.id);

              if (groups.length > 0) {
                return (
                  <div key={provider.id} className="mb-3 last:mb-0">
                    <div className="sticky top-0 bg-bg-elevated px-2 py-1.5 text-[var(--text-xs)] font-bold uppercase tracking-wide text-text-dim border-b border-border mb-1">
                      {provider.name}
                    </div>
                    {groups.map((group) => {
                      const selectable = group.models.filter(
                        (m) => m.apiId && availableModelIds.has(m.apiId),
                      );
                      if (selectable.length === 0) return null;
                      return (
                        <div key={group.name} className="mb-2 last:mb-0">
                          <div className="px-2 py-1 text-[var(--text-xs)] font-semibold text-text-muted">
                            {group.name}
                          </div>
                          {selectable.map((m) => (
                            <button
                              key={m.apiId}
                              type="button"
                              onClick={() => m.apiId && handleSelect(m.apiId)}
                              className={modelOptionClass(m.apiId)}
                            >
                              <span className="truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              const flatModels = getModelsByProvider(provider.id).filter(
                (m) => m.apiId && availableModelIds.has(m.apiId),
              );
              if (flatModels.length === 0) return null;

              return (
                <div key={provider.id} className="mb-2 last:mb-0">
                  <div className="sticky top-0 bg-bg-elevated px-2 py-1.5 text-[var(--text-xs)] font-bold uppercase tracking-wide text-text-dim border-b border-border mb-1">
                    {provider.name}
                  </div>
                  {flatModels.map((m) => (
                    <button
                      key={m.apiId}
                      type="button"
                      onClick={() => m.apiId && handleSelect(m.apiId)}
                      className={modelOptionClass(m.apiId)}
                    >
                      <span className="truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
