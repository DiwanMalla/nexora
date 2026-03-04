"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Paperclip, Sparkles, Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const suggestedPrompts = [
  "Research the latest in AI agents",
  "Analyze my quarterly data",
  "Write a professional email",
  "Debug my React component",
];

export function CommandBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} role="search" aria-label="Ask or create">
        <div className="group relative rounded-2xl border border-white/[0.08] bg-[var(--bg-card)] shadow-2xl shadow-black/30 transition-all duration-300 focus-within:border-violet/25 focus-within:shadow-violet/5 hover:border-white/[0.12]">
          {/* Animated gradient glow */}
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-violet/10 via-transparent to-cyan/10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />

          <div className="relative">
            <textarea
              ref={inputRef}
              name="q"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything, search anything, create anything…"
              className="w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[15px] text-white placeholder:text-[var(--text-dim)] focus:outline-none"
              aria-label="Search or ask"
              autoComplete="off"
              style={{ minHeight: "56px", maxHeight: "120px" }}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between border-t border-white/[0.04] px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg p-2 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg p-2 text-[var(--text-dim)] transition hover:bg-white/5 hover:text-white",
                    focusRing,
                  )}
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <div className="ml-1 flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                  <Sparkles className="h-3 w-3 text-violet-light" />
                  <span className="text-[11px] font-medium text-[var(--text-dim)]">
                    Auto-route
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  value.trim()
                    ? "bg-violet text-white shadow-lg shadow-violet/25 hover:bg-violet/90"
                    : "bg-white/[0.06] text-[var(--text-dim)] cursor-not-allowed",
                  focusRing,
                )}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Suggested prompts */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setValue(prompt);
              inputRef.current?.focus();
            }}
            className={cn(
              "rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition",
              "hover:border-violet/20 hover:bg-violet/[0.06] hover:text-white",
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
