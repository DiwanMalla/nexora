/**
 * CommandBar — The main chat input bar used across workspace and agent pages.
 *
 * Features:
 *   - Auto-resizing textarea with Enter-to-submit
 *   - Toolbar buttons (attach, search, multi-chat, voice)
 *   - Integrated model picker dropdown (via ModelDropdown)
 *   - Optional upgrade banner and terms footer
 *
 * Refactored: ModelDropdown extracted into its own component.
 * Removed `as any` cast with proper typing.
 */

"use client";

import { useRef, useState } from "react";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Cpu,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_BUTTON } from "@/lib/styles";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { ModelDropdown } from "./ModelDropdown";

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
  /** Use a wider max-width (e.g. for centered multi-chat empty state). */
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

  const showModelChooser =
    showModelSelector && selectedAgent === "aichat" && !isMultiChat;

  // ─── Handlers ──────────────────────────────────────

  const handleInternalChange = (
    e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>,
  ) => {
    setInternalValue(e.target.value);
  };

  const handleInputChange = externalHandleChange || handleInternalChange;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    externalOnSubmit?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ─── Render ────────────────────────────────────────

  return (
    <div
      className={cn(
        "mx-auto w-full",
        wide ? "max-w-5xl" : "max-w-3xl",
        compact ? "px-0" : "px-4",
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn("relative flex flex-col", compact ? "gap-1" : "gap-3")}
      >
        <div
          className={cn(
            "flex flex-col gap-0 overflow-visible border border-border bg-bg-elevated/95 shadow-2xl backdrop-blur-md",
            compact ? "rounded-xl" : "rounded-[1.25rem]",
          )}
        >
          {/* Upgrade Banner (hidden in compact view) */}
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

          {/* Textarea */}
          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={externalPlaceholder || "Message Nexora..."}
            className={cn(
              "w-full resize-none bg-transparent text-[var(--text-base)] font-normal leading-[var(--leading-relaxed)] text-text placeholder:text-text-dim outline-none focus:outline-none focus:ring-0 focus:border-none ring-0 shadow-none border-none",
              compact ? "px-4 py-2" : "px-5 py-3",
            )}
            style={{
              minHeight: compact ? "40px" : "60px",
              maxHeight: "200px",
            }}
          />

          {/* Toolbar */}
          <div
            className={cn(
              "flex items-center justify-between px-3",
              compact ? "py-1.5" : "py-2.5",
            )}
          >
            {/* Left actions */}
            <div className="flex items-center gap-1.5">
              <button type="button" className={ICON_BUTTON} title="Attach">
                <Paperclip className="h-4 w-4" />
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

            {/* Center: Model picker or Agentic label */}
            {showModelChooser ? (
              <ModelDropdown
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                isOpen={modelDropdownOpen}
                onToggle={() => setModelDropdownOpen(!modelDropdownOpen)}
                onClose={() => setModelDropdownOpen(false)}
              />
            ) : (
              selectedAgent !== "aichat" && (
                <div className="flex items-center gap-1.5 rounded-full bg-surface-overlay px-2.5 py-1 border border-border">
                  <Cpu className="h-3 w-3 text-text-dim" />
                  <span className="text-[var(--text-xs)] font-semibold uppercase tracking-wide text-text-dim">
                    Agentic
                  </span>
                </div>
              )
            )}

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button type="button" className={ICON_BUTTON} title="Voice">
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

        {/* Terms footer */}
        {!compact && (
          <div className="mt-2 flex items-center justify-center gap-4 text-[var(--text-xs)] font-semibold text-text-dim uppercase tracking-wide opacity-80">
            <span>By using Nexora, you agree to our Terms & Privacy</span>
          </div>
        )}
      </form>
    </div>
  );
}
