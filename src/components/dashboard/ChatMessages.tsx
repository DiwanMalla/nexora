"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot as BotIcon, Copy, RotateCcw, ThumbsUp, ThumbsDown, MoreHorizontal } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pb-40">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex w-full gap-5 animate-in fade-in slide-in-from-bottom-3 duration-500",
            m.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {m.role !== "user" && (
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] shadow-sm">
              <BotIcon className="h-4 w-4 text-violet-light" />
            </div>
          )}
          
          <div
            className={cn(
              "group relative max-w-[85%]",
              m.role === "user"
                ? "rounded-3xl bg-[#2F2F2F] px-5 py-3 text-white shadow-sm"
                : "flex-1 px-1 py-1"
            )}
          >
            <div className={cn(
              "prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:my-4 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5 text-[16px] font-normal",
              m.role === "assistant" ? "text-slate-200" : "text-white"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            </div>

            {m.role !== "user" && (
              <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Good response">
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Bad response">
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white" aria-label="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                <span className="mx-1 h-3 w-px bg-white/10" />
                <button className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-white">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex w-full gap-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] animate-pulse">
            <BotIcon className="h-4 w-4 text-violet-light" />
          </div>
          <div className="flex items-center gap-1.5 py-4">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light/50 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light/50 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-light/50 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
