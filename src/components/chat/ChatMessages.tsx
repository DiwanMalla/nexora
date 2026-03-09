"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Download, 
  Hexagon,
  Search,
  Globe,
  Database,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types";
import { useEffect, useState } from "react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  agentId?: string;
  /** Ref attached to the last message so parent can scroll it to top of viewport */
  lastMessageRef?: React.RefObject<HTMLDivElement | null>;
}

const getResearchSteps = (query: string) => [
  { id: 'query', label: "Query Analysis", sub: "Understanding search intent...", icon: Search },
  { id: 'search', label: "Web Search", sub: `Searching for '${query}'...`, icon: Globe },
  { id: 'analysis', label: "Deep Analysis", sub: "Reading and analyzing top results...", icon: Database },
  { id: 'fact-check', label: "Fact Checking", sub: "Verifying information across sources...", icon: ShieldCheck },
  { id: 'synthesize', label: "Researcher", sub: "Synthesizing findings into a summary...", icon: Hexagon },
];

export function ChatMessages({ messages, isLoading, agentId, lastMessageRef }: ChatMessagesProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "answers";
  const researchSteps = getResearchSteps(lastUserMessage);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev < researchSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
      return () => {
        clearInterval(interval);
        setCurrentStep(0);
      };
    }
  }, [isLoading]);

  if (messages.length === 0) return null;

  const renderMessage = (m: ChatMessage, isLast: boolean) => (
    <div
      key={m.id}
      ref={isLast ? lastMessageRef : undefined}
      className={cn(
        "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-700",
        m.role === "user" ? "justify-end" : "justify-start flex-col"
      )}
    >
      {m.role === "user" ? (
        <div className="flex items-center gap-3">
          <div className="max-w-[80%] rounded-2xl bg-bg-card border border-border px-4 py-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text">
            {m.content}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-invert text-surface-invert-text text-[var(--text-xs)] font-semibold shadow-sm">
            DM
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong border border-border shadow-sm">
              <Hexagon className="h-4 w-4 text-text" />
            </div>
            <span className="text-[var(--text-base)] font-semibold text-text tracking-tight">Nexora</span>
          </div>
          <div className="typography-prose max-w-none pl-11">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m.content}
            </ReactMarkdown>
          </div>
          <div className="flex items-center gap-4 pl-11">
            <button className="text-text-dim hover:text-text transition-colors" title="Copy">
              <Copy className="h-4 w-4" />
            </button>
            <button className="text-text-dim hover:text-text transition-colors" title="Helpful">
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button className="text-text-dim hover:text-text transition-colors" title="Not helpful">
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button className="text-text-dim hover:text-text transition-colors" title="Download">
              <Download className="h-4 w-4" />
            </button>
            {m.model && (
              <div className="ml-auto flex items-center gap-2 rounded-full bg-surface-overlay/50 border border-border px-3 py-1 animate-in fade-in slide-in-from-right-2 duration-1000">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim/80">
                  {m.model.split("/").pop()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 pb-60">
      {messages.map((m, idx) => renderMessage(m, idx === messages.length - 1))}
      {isLoading && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong border border-border shadow-lg animate-pulse">
              <Hexagon className="h-4 w-4 text-text" />
            </div>
            <span className="text-[var(--text-base)] font-bold text-text tracking-[0.2em] uppercase">Nexora Search</span>
          </div>
          <div className="flex flex-col gap-5 pl-4 border-l border-border ml-4">
            {researchSteps.map((step, i) => {
              const Icon = step.icon;
              const isCompleted = i < currentStep;
              const isActive = i === currentStep;
              const isPending = i > currentStep;
              return (
                <div key={step.id} className={cn(
                  "flex items-start gap-4 transition-all duration-500",
                  isPending ? "opacity-20 grayscale" : "opacity-100"
                )}>
                  <div className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
                    isCompleted ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" :
                    isActive ? "border-border-hover bg-surface-overlay-strong text-text animate-pulse" :
                    "border-border text-text-dim"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className={cn(
                      "text-[var(--text-sm)] font-semibold uppercase tracking-wide transition-colors",
                      isActive ? "text-text" : "text-text-muted"
                    )}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="text-[var(--text-sm)] text-text-dim animate-in fade-in slide-in-from-left-2 duration-700">
                        {step.sub}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
