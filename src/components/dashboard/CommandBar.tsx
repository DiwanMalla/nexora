"use client";

import { useRef, useState } from "react";
import {
  Paperclip,
  Sparkles,
  Mic,
  ArrowUp,
  Layers,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";

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
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
}: CommandBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");

  const { isMultiChat, setIsMultiChat, selectedAgent } = useWorkspace();

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
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-violet-light">
          <MessageSquare className="h-3.5 w-3.5" />
          Agentic Chat
        </div>
      </div>

      <form onSubmit={handleSubmit} aria-label="Chat input">
        <div className="group relative rounded-3xl border border-white/10 bg-[#0E0E12] shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_rgba(255,255,255,0.05)] transition-all duration-300 focus-within:border-violet-500/30">
          <div className="relative p-2">
            <textarea
              ref={inputRef}
              name="q"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent px-6 pb-4 pt-6 text-lg font-medium text-white placeholder:text-slate-700 focus:outline-none"
              aria-label="Search or ask"
              aria-label="Message"
              autoComplete="off"
              style={{ minHeight: "80px", maxHeight: "200px" }}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-3 pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Voice input"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiChat(!isMultiChat)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                    isMultiChat
                      ? "bg-violet/20 text-violet-light border border-violet/30 shadow-lg"
                      : "text-slate-500 hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Multi Chat Mode"
                  title="Multi Chat Mode"
                >
                  <Layers className="h-5 w-5" />
                </button>
                <div className="ml-2 hidden items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 sm:flex">
                  <Sparkles className="h-3.5 w-3.5 text-violet-light" />
                  <span className="text-[12px] font-bold tracking-wide text-slate-400 uppercase">
                    AI Copilot
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                  value.trim()
                    ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-900/40 hover:scale-105"
                    : "bg-white/[0.05] text-slate-700 cursor-not-allowed",
                  focusRing,
                )}
                aria-label="Send"
              >
                <ArrowUp className="h-5 w-5 stroke-[3px]" />
              </button>
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
