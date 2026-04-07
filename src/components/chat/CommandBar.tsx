/**
 * CommandBar — Premium glass AI composer (HTML export): frosted panel,
 * model + reasoning pills, char count, textarea, toolbar + Multi + send.
 */

"use client";

import { useRef, useState } from "react";
import {
  Paperclip,
  ArrowUp,
  Cpu,
  Layers,
  Brain,
  Image as ImageIcon,
  Globe,
  Wand2,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/styles";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { ModelDropdown } from "./ModelDropdown";
import { AGENT_TYPE_LABELS } from "@/types";
import type { ComposerAttachment } from "@/hooks/use-composer-attachment";

const INPUT_MAX = 8000;

/** Mock export palette — composer only */
const C = {
  onSurface: "#dee5ff",
  onSurfaceVariant: "#91aaeb",
  surfaceHighest: "#00225a",
  surfaceBright: "#002867",
  outlineVar: "#2b4680",
  secondaryContainer: "#2d3c51",
  primary: "#d2bbff",
  primaryContainer: "#5a00c6",
  onPrimary: "#5200b5",
} as const;

function reasoningLabelForModel(modelId: string): string {
  const id = modelId.toLowerCase();
  if (
    id.includes("o3") ||
    id.includes("sonnet") ||
    id.includes("70b") ||
    id.includes("kimi") ||
    id.includes("deepseek") ||
    id.includes("120b") ||
    id.includes("32b")
  ) {
    return "High Reasoning";
  }
  if (
    id.includes("mini") ||
    id.includes("8b-instant") ||
    id.includes("scout") ||
    id.includes("20b") ||
    id.includes("safeguard")
  ) {
    return "Fast";
  }
  return "Balanced";
}

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
  wide?: boolean;
  /** v1 single-file attachment */
  composerAttachment?: ComposerAttachment | null;
  onOpenAttachmentPicker?: () => void;
  onClearComposerAttachment?: () => void;
  attachmentFileInputRef?: React.RefObject<HTMLInputElement | null>;
  onAttachmentFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
  showModelSelector = true,
  compact = false,
  wide = false,
  composerAttachment = null,
  onOpenAttachmentPicker,
  onClearComposerAttachment,
  attachmentFileInputRef,
  onAttachmentFileChange,
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
    omniProvider,
    setOmniProvider,
    chatWebSearchEnabled,
    setChatWebSearchEnabled,
  } = useWorkspace();

  const value = externalInput !== undefined ? externalInput : internalValue;
  const charCount = value.length;

  const attachmentReady =
    composerAttachment?.phase === "ready" &&
    composerAttachment.id !== "pending" &&
    composerAttachment.id !== "local";
  const attachmentBusy =
    composerAttachment?.phase === "uploading" ||
    composerAttachment?.phase === "processing";
  const canSend =
    (value.trim().length > 0 || attachmentReady) &&
    !attachmentBusy &&
    charCount <= INPUT_MAX;

  const showModelChooser =
    showModelSelector && selectedAgent === "aichat" && !isMultiChat;

  const handleInternalChange = (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
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

  const agentShortLabel =
    (selectedAgent && AGENT_TYPE_LABELS[selectedAgent]) || "Agent";

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg p-2 text-[#91aaeb] transition-colors hover:bg-[#00225a] hover:text-[#d2bbff]";

  const reasoningPill = (label: string) => (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-[#2b4680]/10 px-3 py-1.5"
      style={{ backgroundColor: "rgba(45, 60, 81, 0.5)" }}
    >
      <Brain className="h-3.5 w-3.5 shrink-0" style={{ color: C.primary }} />
      <span
        className="text-[11px] font-bold"
        style={{ color: C.onSurfaceVariant }}
      >
        {label}
      </span>
    </span>
  );

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
        {!compact && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:px-4">
            <p className="min-w-0 truncate text-[var(--text-xs)] font-semibold uppercase tracking-wide text-text-dim">
              Upgrade to keep chats flowing without limits.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border bg-surface-overlay px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text transition-colors hover:bg-surface-overlay-strong sm:px-3 sm:text-[var(--text-xs)]"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        <div
          className={cn(
            "glass-composer rounded-2xl p-2",
            compact && "rounded-xl",
          )}
        >
          <div className="flex flex-col overflow-visible">
            {/* Composer header — pills + char count */}
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {showModelChooser ? (
                  <>
                    <ModelDropdown
                      selectedModel={selectedModel}
                      onSelectModel={setSelectedModel}
                      isOpen={modelDropdownOpen}
                      onToggle={() => setModelDropdownOpen(!modelDropdownOpen)}
                      onClose={() => setModelDropdownOpen(false)}
                      placement="above"
                      glass
                    />
                    {reasoningPill(reasoningLabelForModel(selectedModel))}
                  </>
                ) : selectedAgent === "omni" ? (
                  <>
                    <div
                      className="inline-flex items-center gap-2 rounded-full border border-[#2b4680]/30 px-3 py-1.5"
                      style={{ backgroundColor: C.surfaceHighest }}
                    >
                      <Cpu
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: C.primary }}
                      />
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: C.onSurface }}
                      >
                        Omni
                      </span>
                    </div>
                    <div
                      className="inline-flex items-center gap-0.5 rounded-full border border-[#2b4680]/20 p-0.5"
                      style={{ backgroundColor: "rgba(0, 34, 90, 0.35)" }}
                    >
                      <button
                        type="button"
                        onClick={() => setOmniProvider("groq")}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                          omniProvider === "groq"
                            ? "text-[#5200b5]"
                            : "text-[#91aaeb] hover:text-[#dee5ff]",
                          omniProvider === "groq" &&
                            "bg-gradient-to-r from-[#d2bbff] to-[#5a00c6]",
                        )}
                      >
                        Groq
                      </button>
                      <button
                        type="button"
                        onClick={() => setOmniProvider("openrouter")}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                          omniProvider === "openrouter"
                            ? "text-[#5200b5]"
                            : "text-[#91aaeb] hover:text-[#dee5ff]",
                          omniProvider === "openrouter" &&
                            "bg-gradient-to-r from-[#d2bbff] to-[#5a00c6]",
                        )}
                      >
                        OpenRouter
                      </button>
                    </div>
                    {reasoningPill("Deep research")}
                  </>
                ) : (
                  <>
                    <div
                      className="inline-flex items-center gap-2 rounded-full border border-[#2b4680]/30 px-3 py-1.5"
                      style={{ backgroundColor: C.surfaceHighest }}
                    >
                      <Cpu
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: C.primary }}
                      />
                      <span
                        className="max-w-[160px] truncate text-[11px] font-bold sm:max-w-[240px]"
                        style={{ color: C.onSurface }}
                      >
                        {agentShortLabel}
                      </span>
                    </div>
                    {reasoningPill("Agentic")}
                  </>
                )}
              </div>
              <span
                className="shrink-0 tabular-nums text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color:
                    charCount > INPUT_MAX * 0.95
                      ? "#fbbf24"
                      : "rgba(145, 170, 235, 0.4)",
                }}
              >
                {charCount.toLocaleString()} / {INPUT_MAX.toLocaleString()}
              </span>
            </div>

            <input
              ref={attachmentFileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onAttachmentFileChange}
              aria-hidden
              tabIndex={-1}
            />

            {composerAttachment ? (
              <div className="mx-3 mb-1 flex flex-wrap items-center gap-2">
                <div
                  className={cn(
                    "inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold",
                    composerAttachment.phase === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : "border-[#2b4680]/30 bg-[#00225a]/50 text-[#dee5ff]",
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span className="min-w-0 truncate">
                    {composerAttachment.originalName}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide text-[#91aaeb]">
                    {composerAttachment.phase === "uploading" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading…
                      </>
                    ) : composerAttachment.phase === "processing" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing…
                      </>
                    ) : composerAttachment.phase === "ready" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Ready
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-300" />
                        Error
                      </>
                    )}
                  </span>
                  {composerAttachment.phase === "error" &&
                  composerAttachment.errorMessage ? (
                    <span className="sr-only">
                      {composerAttachment.errorMessage}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onClearComposerAttachment?.()}
                    className={cn(
                      "ml-1 rounded-lg p-1 text-[#91aaeb] transition-colors hover:bg-[#002867] hover:text-[#dee5ff]",
                      FOCUS_RING,
                    )}
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {composerAttachment.phase === "error" &&
                composerAttachment.errorMessage ? (
                  <span className="text-[11px] font-medium text-red-300/90">
                    {composerAttachment.errorMessage}
                  </span>
                ) : null}
              </div>
            ) : null}

            <textarea
              ref={inputRef}
              rows={compact ? 2 : 3}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={INPUT_MAX}
              placeholder={externalPlaceholder || "Message Nexora AI..."}
              className="w-full resize-none border-none bg-transparent px-4 py-3 font-sans text-base leading-[var(--leading-relaxed)] text-[#dee5ff] outline-none ring-0 placeholder:text-[#91aaeb]/40 focus:outline-none focus:ring-0"
              style={{
                minHeight: compact ? "52px" : "100px",
                maxHeight: "200px",
              }}
            />

            {/* Composer footer */}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#2b4680]/10 px-3 pb-2 pt-1">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenAttachmentPicker?.()}
                  disabled={attachmentBusy}
                  className={cn(
                    iconBtn,
                    FOCUS_RING,
                    attachmentBusy && "opacity-40",
                  )}
                  title="Attach file (PDF, TXT, MD, DOCX — max 10 MB)"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={cn(iconBtn, FOCUS_RING)}
                  title="Image"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChatWebSearchEnabled(!chatWebSearchEnabled)}
                  aria-pressed={chatWebSearchEnabled}
                  className={cn(
                    iconBtn,
                    FOCUS_RING,
                    chatWebSearchEnabled &&
                      "bg-[#00225a] text-[#d2bbff] hover:text-[#d2bbff]",
                  )}
                  title={
                    chatWebSearchEnabled
                      ? "Web search on (Tavily) — click to disable"
                      : "Web search off — click to enable Tavily for AI Chat"
                  }
                >
                  <Globe className="h-5 w-5" />
                </button>
                <span
                  className="mx-1 hidden h-4 w-px bg-[#2b4680]/20 sm:block"
                  aria-hidden
                />
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-[#91aaeb] transition-colors hover:bg-[#00225a] hover:text-[#dee5ff]",
                    FOCUS_RING,
                  )}
                  title="Presets (coming soon)"
                >
                  <Wand2 className="h-[18px] w-[18px] text-[#d2bbff]" />
                  <span className="hidden sm:inline">Presets</span>
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {selectedAgent !== "omni" && (
                  <button
                    type="button"
                    onClick={() => setIsMultiChat(!isMultiChat)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all sm:px-3",
                      FOCUS_RING,
                      isMultiChat
                        ? "border-[#d2bbff]/30 bg-[#5a00c6]/20 text-[#d2bbff] shadow-[0_0_20px_rgba(210,187,255,0.12)]"
                        : "border-[#2b4680]/30 bg-[#00225a]/40 text-[#91aaeb] hover:bg-[#002867] hover:text-[#dee5ff]",
                    )}
                    title={
                      isMultiChat
                        ? "Exit multi-model view"
                        : "Compare multiple models"
                    }
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[4.5rem] truncate sm:max-w-none">
                      Multi
                    </span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSend}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all focus:outline-none",
                    FOCUS_RING,
                    canSend
                      ? "bg-gradient-to-br from-[#d2bbff] to-[#5a00c6] shadow-lg shadow-[#d2bbff]/20 hover:brightness-110 active:scale-95"
                      : "cursor-not-allowed opacity-40",
                  )}
                  style={
                    canSend
                      ? { color: C.onPrimary }
                      : { color: C.onSurfaceVariant }
                  }
                  title="Send message"
                >
                  <ArrowUp className="h-5 w-5 stroke-[2.5px]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="mt-4 flex justify-center">
              <div
                className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium"
                style={{ color: "rgba(145, 170, 235, 0.5)" }}
              >
                <div className="flex items-center gap-1">
                  <kbd className="rounded border border-[#2b4680]/20 bg-[#00225a] px-1.5 py-0.5 text-[9px] font-semibold text-[#91aaeb]">
                    ENTER
                  </kbd>
                  <span>to send</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border border-[#2b4680]/20 bg-[#00225a] px-1.5 py-0.5 text-[9px] font-semibold text-[#91aaeb]">
                    SHIFT + ENTER
                  </kbd>
                  <span>for new line</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-[var(--text-xs)] font-semibold uppercase tracking-wide text-text-dim opacity-80">
              By using Nexora, you agree to our Terms & Privacy
            </div>
          </>
        )}
      </form>
    </div>
  );
}
