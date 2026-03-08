"use client";

import { useRef, useState } from "react";
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
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
  showModelSelector = true,
  compact = false,
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
    <div className={cn("mx-auto w-full max-w-3xl", compact ? "px-0" : "px-4")}>
      <form onSubmit={handleSubmit} className={cn("relative flex flex-col", compact ? "gap-1" : "gap-3")}>
        <div className={cn("flex flex-col gap-0 overflow-hidden border border-white/10 bg-[#141414]/90 shadow-2xl backdrop-blur-md", compact ? "rounded-xl" : "rounded-[1.25rem]")}>
          {/* Internal Upgrade Banner - hidden in compact (agent) view */}
          {!compact && (
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 border border-white/10">
                <ArrowUp className="h-2.5 w-2.5 text-white rotate-45" />
              </div>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest leading-none">
                Upgrade to keep chats flowing without limits.
              </p>
            </div>
            <button className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all focus:outline-none focus:ring-0">
              Upgrade to Pro
            </button>
          </div>
          )}

          {/* Top Label */}
          {showTopLabel && (
            <div className={cn("flex items-center gap-2 px-4", compact ? "pt-2 pb-0.5" : "pt-3 pb-1")}>
              {showModelChooser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Cpu className="h-3 w-3 text-violet-400" />
                    <span className="text-[10px] font-bold text-white">
                      {AVAILABLE_MODELS.find((m) => m.id === selectedModel)
                        ?.name || "Select Model"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 text-text-muted transition-transform",
                        modelDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {modelDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-48 z-40 overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="max-h-60 overflow-y-auto p-1">
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setModelDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold transition-colors",
                              m.id === selectedModel
                                ? "bg-white/10 text-white"
                                : "text-text-muted hover:bg-white/[0.04] hover:text-white",
                            )}
                          >
                            <span className="truncate">{m.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 border border-white/5">
                  <Cpu className="h-3 w-3 text-text-dim" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                    Agentic
                  </span>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={externalPlaceholder || "Message Nexora..."}
            className={cn("w-full resize-none bg-transparent text-[14px] font-normal leading-relaxed text-white placeholder:text-text-dim outline-none focus:outline-none focus:ring-0 focus:border-none ring-0 shadow-none border-none", compact ? "px-4 py-2" : "px-5 py-3")}
            style={{ minHeight: compact ? "40px" : "60px", maxHeight: "200px" }}
          />

          {/* Toolbar */}
          <div className={cn("flex items-center justify-between px-3", compact ? "py-1.5" : "py-2.5")}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-0"
                title="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-0"
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
                      ? "bg-white/10 text-white"
                      : "text-text-dim hover:bg-white/10 hover:text-white",
                  )}
                  title="Multi-Chat"
                >
                  <Layers className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all focus:outline-none focus:ring-0"
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
                    ? "bg-white text-black hover:scale-105"
                    : "bg-white/5 text-gray-700 cursor-not-allowed",
                )}
              >
                <ArrowUp className="h-4 w-4 stroke-[3px]" />
              </button>
            </div>
          </div>
        </div>

        {!compact && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-text-dim uppercase tracking-widest opacity-80">
          <span>By using Nexora, you agree to our Terms & Privacy</span>
        </div>
        )}
      </form>
    </div>
  );
}
