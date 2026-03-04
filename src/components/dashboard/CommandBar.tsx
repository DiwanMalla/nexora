"use client";

import { useRef, useState } from "react";
import {
  Paperclip,
  Sparkles,
  Mic,
  ArrowUp,
  Layers,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const suggestedPrompts = [
  "Help me plan today’s tasks",
  "Explain this bug and fix approach",
  "Draft a clean commit message",
];

export interface CommandBarProps {
  input?: string;
  handleInputChange?: (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onSubmit?: (e: React.FormEvent) => void;
  placeholder?: string;
  showModelSelector?: boolean;
  compact?: boolean;
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
  showModelSelector = false,
  compact = false,
}: CommandBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const { isMultiChat, setIsMultiChat, selectedAgent, selectedModel, setSelectedModel } = useWorkspace();
  const activeModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const value = externalInput !== undefined ? externalInput : internalValue;

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

  const placeholder =
    externalPlaceholder ||
    (selectedAgent === "ai-chat"
      ? "Message Nexora..."
      : "Ask your expert agent...");

  return (
    <div className={cn("mx-auto w-full", !compact && "max-w-3xl")}>
      {!compact && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-violet-light">
            <MessageSquare className="h-3.5 w-3.5" />
            Agentic Chat
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Chat input">
        <div className="group relative rounded-[2rem] border border-white/5 bg-[#0A0A0B] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.02)] transition-all duration-500 focus-within:border-violet-500/20 focus-within:shadow-[0_20px_50px_rgba(139,92,246,0.1)]">
          <div className="relative p-2.5">
            <textarea
              ref={inputRef}
              name="q"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent px-6 pb-4 pt-6 text-[17px] font-normal leading-relaxed text-white placeholder:text-slate-600 focus:outline-none"
              aria-label="Message Nexora"
              autoComplete="off"
              style={{ minHeight: "72px", maxHeight: "200px" }}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-all hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Upload file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-all hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Voice"
                >
                  <Mic className="h-5 w-5" />
                </button>
                
                <div className="h-4 w-px bg-white/5 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsMultiChat(!isMultiChat)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                    isMultiChat
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-500 hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Multi-Chat"
                  title="Multi-Chat Mode"
                >
                  <Layers className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {showModelSelector && activeModel ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-2 pr-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10",
                        focusRing,
                      )}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet/20 border border-violet/30">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                      </div>
                      <span className="max-w-[120px] truncate">{activeModel.name}</span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", modelDropdownOpen && "rotate-180")} />
                    </button>
                    {modelDropdownOpen && (
                      <div className="absolute right-0 bottom-full z-50 mb-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0E0E12] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setModelDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
                              selectedModel === m.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                            )}
                          >
                            <span className="truncate">{m.name}</span>
                            <span className="text-[10px] text-slate-600">{m.provider}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden items-center gap-2 rounded-xl border border-white/[0.03] bg-white/[0.01] px-3 py-1.5 sm:flex">
                    <Sparkles className="h-3.5 w-3.5 text-violet-light/70" />
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                      {selectedAgent === 'ai-chat' ? 'Pro' : selectedAgent}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!value.trim()}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500",
                    value.trim()
                      ? "bg-white text-black shadow-xl hover:scale-105 active:scale-95"
                      : "bg-white/5 text-slate-700 cursor-not-allowed",
                    focusRing,
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="h-5.5 w-5.5 stroke-[2.5px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Suggested prompts */}
      {value === "" && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                if (externalHandleChange) {
                  const event = { target: { value: prompt } } as any;
                  externalHandleChange(event);
                } else {
                  setInternalValue(prompt);
                }
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className={cn(
                "rounded-xl border border-white/5 bg-white/[0.02] px-5 py-2.5 text-sm font-bold text-slate-500 transition-all duration-300",
                "hover:border-violet-500/20 hover:bg-white/[0.05] hover:text-white hover:shadow-lg hover:shadow-black/20",
                focusRing,
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
