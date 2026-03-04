"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Paperclip, Sparkles, Mic, ArrowUp, Globe, Code2, Eye, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const suggestedPrompts = [
  "Research AI trends",
  "Write some code",
  "Summarize a doc",
];

const searchModes = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "search", label: "Search", icon: Globe },
  { id: "code", label: "Code", icon: Code2 },
  { id: "vision", label: "Vision", icon: Eye },
];

export function CommandBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [activeMode, setActiveMode] = useState("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}&mode=${activeMode}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Mode Switcher */}
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-1.5 shadow-inner">
          {searchModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300",
                activeMode === mode.id
                  ? "bg-white/[0.08] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
              )}
            >
              <mode.icon className={cn("h-4 w-4", activeMode === mode.id ? "text-violet-light" : "text-slate-600")} />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} role="search" aria-label="Ask or create">
        <div className="group relative rounded-3xl border border-white/10 bg-[#0E0E12] shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_rgba(255,255,255,0.05)] transition-all duration-300 focus-within:border-violet-500/30">
          
          <div className="relative p-2">
            <textarea
              ref={inputRef}
              name="q"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything, find everything..."
              className="w-full resize-none bg-transparent px-6 pb-4 pt-6 text-lg font-medium text-white placeholder:text-slate-700 focus:outline-none"
              aria-label="Search or ask"
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
                <div className="ml-2 hidden items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 sm:flex">
                  <Sparkles className="h-3.5 w-3.5 text-violet-light" />
                  <span className="text-[12px] font-bold tracking-wide text-slate-400 uppercase">
                    Agentic Search
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
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setValue(prompt);
              inputRef.current?.focus();
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
    </div>
  );
}
