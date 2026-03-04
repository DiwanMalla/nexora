"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Bot as BotIcon, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Download, 
  ChevronDown,
  CheckCircle2,
  Hexagon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 pb-60">
      {messages.map((m, idx) => (
        <div
          key={m.id}
          className={cn(
            "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-700",
            m.role === "user" ? "justify-end" : "justify-start flex-col"
          )}
        >
          {m.role === "user" ? (
            <div className="flex items-center gap-3">
              <div className="max-w-[80%] rounded-2xl bg-[#1A1A1A] border border-white/5 px-4 py-2 text-sm text-gray-200">
                {m.content}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black text-[11px] font-bold shadow-sm">
                DM
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Assistant Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] border border-white/10 shadow-sm">
                  <Hexagon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[13px] font-bold text-white tracking-tight">Nexora</span>
              </div>

              {/* Reasoning Mockup (only for assistant messages) */}
              {idx === messages.length - 1 && !isLoading && (
                <div className="flex flex-col gap-4 pl-4 border-l border-white/5 ml-4 pb-2">
                   <div className="flex items-center gap-3 text-[11px] font-bold text-text-dim uppercase tracking-widest">
                      <span>Reasoning</span>
                      <ChevronDown className="h-3 w-3" />
                   </div>
                   <div className="space-y-4">
                      {[
                        { label: "Context Analysis", sub: "Analyzing conversation context..." },
                        { label: "Intent Recognition", sub: "Understanding user intent..." },
                        { label: "Expert Response", sub: "Formulating technical answer..." }
                      ].map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <CheckCircle2 className="h-4 w-4 text-text-dim mt-0.5" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">{step.label}</span>
                            <span className="text-[11px] text-text-dim">{step.sub}</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-gray-200 pl-11">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pl-11">
                <button className="text-text-dim hover:text-white transition-colors" title="Copy">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="text-text-dim hover:text-white transition-colors" title="Helpful">
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button className="text-text-dim hover:text-white transition-colors" title="Not helpful">
                  <ThumbsDown className="h-4 w-4" />
                </button>
                <button className="text-text-dim hover:text-white transition-colors" title="Download">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] border border-white/10">
              <Hexagon className="h-4 w-4 text-white/50" />
            </div>
            <span className="text-[13px] font-bold text-white/50 tracking-tight tracking-widest uppercase">Thinking...</span>
          </div>
          <div className="space-y-3 pl-11">
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-5/6 rounded bg-white/5" />
            <div className="h-3 w-4/6 rounded bg-white/5" />
          </div>
        </div>
      )}

      {/* Upgrade Banner */}
      <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/5 bg-[#161616]/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <BotIcon className="h-4 w-4 text-text-dim" />
          <p className="text-[12px] font-medium text-text-dim">Upgrade to keep chats flowing without limits.</p>
        </div>
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
