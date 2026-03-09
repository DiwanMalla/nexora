"use client";

import { useRef, useState, useMemo } from "react";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Globe,
  Cpu,
  CornerDownLeft,
  Layers,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import {
  AI_PROVIDERS,
  getProviderGroups,
  getModelsByProvider,
  getModelNameByApiId,
} from "@/lib/ai-providers";

export interface CommandBarProps {
  input?: string;
  handleInputChange?: (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onSubmit?: (e: React.FormEvent) => void;
  placeholder?: string;
  compact?: boolean;
  showModelSelector?: boolean;
  /** Use a wider max-width (e.g. for centered multi-chat empty state) */
  wide?: boolean;
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
  showModelSelector = true,
  compact = false,
  wide = false,
}: CommandBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const {
    isMultiChat,
    setIsMultiChat,
    selectedAgent,
    selectedModel,
    setSelectedModel,
  } = useWorkspace();
  const value = externalInput !== undefined ? externalInput : internalValue;

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

  const showModelChooser =
    showModelSelector && selectedAgent === "aichat" && !isMultiChat;
  const showTopLabel = showModelChooser || selectedAgent !== "aichat";

  const handleInternalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
  };

  const handleInputChange =
    externalHandleChange || (handleInternalChange as any);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (externalOnSubmit) {
      externalOnSubmit(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn("mx-auto w-full", wide ? "max-w-5xl" : "max-w-3xl", compact ? "px-0" : "px-4")}>
      <form onSubmit={handleSubmit} className={cn("relative flex flex-col", compact ? "gap-1" : "gap-3")}>
        <div className={cn("flex flex-col gap-0 overflow-visible border border-border bg-bg-elevated/95 shadow-2xl backdrop-blur-md", compact ? "rounded-xl" : "rounded-[1.25rem]")}>
          {/* Internal Upgrade Banner - hidden in compact (agent) view */}
          {!compact && (
          <div className="flex items-center justify-between border-b border-border bg-surface-overlay px-5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-overlay border border-border">
                <ArrowUp className="h-2.5 w-2.5 text-text rotate-45" />
              </div>
              <p className="text-[var(--text-xs)] font-semibold text-text-dim uppercase tracking-wide leading-snug">
                Upgrade to keep chats flowing without limits.
              </p>
            </div>
            <button className="rounded border border-border bg-surface-overlay px-2 py-1 text-[var(--text-xs)] font-bold text-text uppercase tracking-wide hover:bg-surface-overlay-strong transition-all focus:outline-none focus:ring-0">
              Upgrade to Pro
            </button>
          </div>
          )}

          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={externalPlaceholder || "Message Nexora..."}
            className={cn("w-full resize-none bg-transparent text-[var(--text-base)] font-normal leading-[var(--leading-relaxed)] text-text placeholder:text-text-dim outline-none focus:outline-none focus:ring-0 focus:border-none ring-0 shadow-none border-none", compact ? "px-4 py-2" : "px-5 py-3")}
            style={{ minHeight: compact ? "40px" : "60px", maxHeight: "200px" }}
          />

          {/* Toolbar */}
          <div className={cn("flex items-center justify-between px-3", compact ? "py-1.5" : "py-2.5")}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-overlay-strong hover:text-text transition-all focus:outline-none focus:ring-0"
                title="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-overlay-strong hover:text-text transition-all focus:outline-none focus:ring-0"
                title="Search Global"
              >
                <Globe className="h-4 w-4" />
              </button>
              {selectedAgent !== "omni" && (
                <button
                  type="button"
                  onClick={() => setIsMultiChat(!isMultiChat)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-0",
                    isMultiChat
                      ? "bg-surface-overlay-strong text-text"
                      : "text-text-dim hover:bg-surface-overlay-strong hover:text-text",
                  )}
                  title="Multi-Chat"
                >
                  <Layers className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Model Picker - Integrated in Toolbar */}
            {showModelChooser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-full bg-surface-overlay pl-2 pr-1.5 py-1 border border-border hover:bg-surface-overlay-strong transition-colors"
                >
                  <Cpu className="h-3 w-3 text-violet-400" />
                  <span className="text-[var(--text-xs)] font-semibold text-white">
                    {selectedModelLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-text-muted transition-transform",
                      modelDropdownOpen && "rotate-180",
                    )}
                  />
                </button>
                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-3 min-w-[220px] max-w-[280px] z-[100] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                      {providersWithModels.map((provider) => {
                        const groups = getProviderGroups(provider.id);
                        const hasGroups = groups.length > 0;
                        if (hasGroups) {
                          return (
                            <div key={provider.id} className="mb-3 last:mb-0">
                              <div className="sticky top-0 bg-bg-elevated px-2 py-1.5 text-[var(--text-xs)] font-bold uppercase tracking-wide text-text-dim border-b border-border mb-1">
                                {provider.name}
                              </div>
                              {groups.map((group) => {
                                const selectable = group.models.filter(
                                  (m) =>
                                    m.apiId &&
                                    availableModelIds.has(m.apiId),
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
                                        onClick={() => {
                                          if (m.apiId) {
                                            setSelectedModel(m.apiId);
                                            setModelDropdownOpen(false);
                                          }
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--text-sm)] font-medium transition-colors",
                                          m.apiId === selectedModel
                                            ? "bg-surface-overlay-strong text-text"
                                            : "text-text-muted hover:bg-surface-overlay hover:text-text",
                                        )}
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
                                onClick={() => {
                                  if (m.apiId) {
                                    setSelectedModel(m.apiId);
                                    setModelDropdownOpen(false);
                                  }
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--text-sm)] font-medium transition-colors",
                                  m.apiId === selectedModel
                                    ? "bg-surface-overlay-strong text-text"
                                    : "text-text-muted hover:bg-surface-overlay hover:text-text",
                                )}
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
            )}
            {/* Show Agentic label if model chooser is not shown but it's not aichat */}
            {!showModelChooser && selectedAgent !== "aichat" && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface-overlay px-2.5 py-1 border border-border">
                <Cpu className="h-3 w-3 text-text-dim" />
                <span className="text-[var(--text-xs)] font-semibold uppercase tracking-wide text-text-dim">
                  Agentic
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-overlay-strong hover:text-text transition-all focus:outline-none focus:ring-0"
                title="Voice"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-0",
                  value.trim()
                    ? "bg-surface-invert text-surface-invert-text hover:scale-105"
                    : "bg-surface-overlay text-text-dim cursor-not-allowed",
                )}
              >
                <ArrowUp className="h-4 w-4 stroke-[3px]" />
              </button>
            </div>
          </div>
        </div>

        {!compact && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[var(--text-xs)] font-semibold text-text-dim uppercase tracking-wide opacity-80">
          <span>By using Nexora, you agree to our Terms & Privacy</span>
        </div>
        )}
      </form>
    </div>
  );
}
