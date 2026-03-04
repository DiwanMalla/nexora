"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Copy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  const latestMessage = messages[messages.length - 1];
  const showHelpfulPrompt = latestMessage?.role === "assistant";

  return (
    <div className="flex flex-col gap-8 pb-32">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex w-full gap-4 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
            m.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {m.role !== "user" && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/10 border border-violet/20 shadow-sm">
              <Bot className="h-4.5 w-4.5 text-violet-light" />
            </div>
          )}

          <div
            className={cn(
              "relative max-w-[85%] rounded-2xl px-5 py-3 shadow-sm transition-all",
              m.role === "user"
                ? "bg-violet text-white shadow-violet-900/20"
                : "bg-white/[0.03] text-slate-200 border border-white/5",
            )}
          >
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            </div>

            {m.role !== "user" && (
              <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-3">
                <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                  <RotateCcw className="h-3 w-3" />
                  Regenerate
                </button>
              </div>
            )}
          </div>

          {m.role === "user" && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-sm">
              <User className="h-4.5 w-4.5 text-slate-400" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex w-full gap-4 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/10 border border-violet/20 animate-pulse">
            <Bot className="h-4.5 w-4.5 text-violet-light" />
          </div>
          <div className="flex items-center gap-1 py-3 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light animate-bounce" />
          </div>
        </div>
      )}

      {showHelpfulPrompt && !isLoading && (
        <div className="px-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Is this conversation helpful so far?
          </p>
        </div>
      )}
    </div>
  );
}
