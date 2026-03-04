"use client";

import { useRef, useState } from "react";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Globe,
  Cpu,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function CommandBar({
  input: externalInput,
  handleInputChange: externalHandleChange,
  onSubmit: externalOnSubmit,
  placeholder: externalPlaceholder,
  compact = false,
}: CommandBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");

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

  return (
    <div className={cn("mx-auto w-full max-w-3xl", compact ? "px-0" : "px-4")}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col gap-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#141414]/90 shadow-2xl backdrop-blur-md focus-within:border-white/20 transition-all">
          {/* Top Label */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 border border-white/5">
              <Cpu className="h-3 w-3 text-text-dim" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Agentic</span>
            </div>
          </div>

          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={externalPlaceholder || "Message Nexora..."}
            className="w-full resize-none bg-transparent px-5 py-3 text-[14px] font-normal leading-relaxed text-white placeholder:text-text-dim focus:outline-none"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all"
                title="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all"
                title="Search Global"
              >
                <Globe className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-white/10 hover:text-white transition-all"
                title="Voice"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  value.trim() 
                    ? "bg-white text-black hover:scale-105" 
                    : "bg-white/5 text-gray-700 cursor-not-allowed"
                )}
              >
                <ArrowUp className="h-4 w-4 stroke-[3px]" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold text-text-dim uppercase tracking-widest opacity-80">
          <span>By using Nexora, you agree to our Terms & Privacy</span>
        </div>
      </form>
    </div>
  );
}
