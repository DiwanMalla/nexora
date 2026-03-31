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
  /** `above` = panel opens upward from the trigger; `below` = opens downward. */
  placement?: "above" | "below";
  /** Frosted “premium composer” trigger + panel (HTML export style). */
  glass?: boolean;
}

export function ModelDropdown({
  selectedModel,
  onSelectModel,
  isOpen,
  onToggle,
  onClose,
  placement = "above",
  glass = false,
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
      glass
        ? apiId === selectedModel
          ? "bg-[#002867]/80 text-[#dee5ff]"
          : "text-[#91aaeb] hover:bg-[#00225a] hover:text-[#dee5ff]"
        : apiId === selectedModel
          ? "bg-surface-overlay-strong text-text"
          : "text-text-muted hover:bg-surface-overlay hover:text-text",
    );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 transition-colors",
          glass
            ? "rounded-full border border-[#2b4680]/30 bg-[#00225a] px-3 py-1.5 hover:bg-[#002867]"
            : cn(
                "border border-border bg-surface-overlay hover:bg-surface-overlay-strong",
                placement === "below" && "rounded-lg px-2.5 py-1.5",
                placement === "above" && "rounded-full pl-2 pr-1.5 py-1",
              ),
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center",
            glass
              ? "h-4 w-4 rounded-sm bg-[#314055]"
              : cn(
                  "h-6 w-6 rounded-md border border-border bg-surface-overlay-strong",
                  placement === "below" && "h-7 w-7",
                ),
          )}
        >
          <Cpu
            className={cn(
              glass
                ? "h-3 w-3 text-[#d2bbff]"
                : "h-3.5 w-3.5 text-[var(--violet-light)]",
            )}
          />
        </span>
        <span
          className={cn(
            "max-w-[140px] truncate text-left text-[11px] font-bold sm:max-w-[200px]",
            glass ? "text-[#dee5ff]" : "text-[var(--text-xs)] font-semibold text-text",
          )}
        >
          {selectedModelLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            glass ? "text-[#91aaeb]" : "text-text-muted",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute left-0 z-[100] min-w-[220px] max-w-[280px] overflow-hidden rounded-xl shadow-2xl animate-in fade-in duration-200",
            glass
              ? "border border-[#2b4680]/40 bg-[#031d4b]/95 backdrop-blur-xl"
              : "border border-border bg-bg-elevated",
            placement === "below"
              ? "top-full mt-2 slide-in-from-top-2"
              : "bottom-full mb-3 slide-in-from-bottom-2",
          )}
        >
          <div
            className={cn(
              "max-h-[400px] overflow-y-auto p-2 scrollbar-thin",
              glass
                ? "scrollbar-thumb-[#2b4680]/50"
                : "scrollbar-thumb-white/10",
            )}
          >
            {providersWithModels.map((provider) => {
              const groups = getProviderGroups(provider.id);

              if (groups.length > 0) {
                return (
                  <div key={provider.id} className="mb-3 last:mb-0">
                    <div
                      className={cn(
                        "sticky top-0 px-2 py-1.5 text-[var(--text-xs)] font-bold uppercase tracking-wide border-b mb-1",
                        glass
                          ? "border-[#2b4680]/30 bg-[#031d4b] text-[#91aaeb]"
                          : "border-border bg-bg-elevated text-text-dim",
                      )}
                    >
                      {provider.name}
                    </div>
                    {groups.map((group) => {
                      const selectable = group.models.filter(
                        (m) => m.apiId && availableModelIds.has(m.apiId),
                      );
                      if (selectable.length === 0) return null;
                      return (
                        <div key={group.name} className="mb-2 last:mb-0">
                          <div
                            className={cn(
                              "px-2 py-1 text-[var(--text-xs)] font-semibold",
                              glass ? "text-[#91aaeb]/80" : "text-text-muted",
                            )}
                          >
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
                  <div
                    className={cn(
                      "sticky top-0 px-2 py-1.5 text-[var(--text-xs)] font-bold uppercase tracking-wide border-b mb-1",
                      glass
                        ? "border-[#2b4680]/30 bg-[#031d4b] text-[#91aaeb]"
                        : "border-border bg-bg-elevated text-text-dim",
                    )}
                  >
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
