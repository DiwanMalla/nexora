"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatMessages } from "@/components/dashboard/ChatMessages";
import { CommandBar } from "@/components/dashboard/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { AIModel, ChatMessage } from "@/types";
import {
  Bot as BotIcon,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Bookmark,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MultiRound = {
  user: string;
  responses: { model: AIModel; content: string; loading?: boolean }[];
};


const AGENT_TYPE_LABELS: Record<string, string> = {
  aichat: "AI Chat",
  researcher: "Researcher",
  coder: "Developer",
  analyst: "Analyst",
};

function getAgentLabel(type: string | null): string {
  return (type && AGENT_TYPE_LABELS[type]) || "AI Chat";
}

export default function AgentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "aichat";
  const idFromUrl = searchParams.get("id");

  const { isMultiChat, selectedModel } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [multiRounds, setMultiRounds] = useState<MultiRound[]>([]);

  const agentLabel = getAgentLabel(type);
  const backHref = `/agents?type=${type}`;

  const updateUrl = useCallback(
    (newId: string | null) => {
      const params = new URLSearchParams();
      params.set("type", type);
      if (newId) params.set("id", newId);
      router.replace(`/agents?${params.toString()}`, { scroll: false });
    },
    [router, type],
  );

  useEffect(() => {
    if (!idFromUrl && (messages.length > 0 || multiRounds.length > 0)) {
      setMessages([]);
      setMultiRounds([]);
    }
  }, [idFromUrl]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>,
  ) => setInput(e.target.value);

  const handleNewChat = () => {
    setMessages([]);
    setMultiRounds([]);
    setChatTitle("");
    updateUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    if (!idFromUrl) {
      const newId = crypto.randomUUID();
      updateUrl(newId);
    }

    if (isMultiChat) {
      const newRound: MultiRound = {
        user: query,
        responses: AVAILABLE_MODELS.map((m) => ({
          model: m,
          content: "",
          loading: true,
        })),
      };
      setMultiRounds((prev) => [...prev, newRound]);

      const apiMessages = nextMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const results = await Promise.all(
        AVAILABLE_MODELS.map(async (model) => {
          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: model.id,
                messages: apiMessages,
              }),
            });
            if (!res.ok) throw new Error("Request failed");
            const data = (await res.json()) as { text?: string };
            return {
              model,
              content: data.text?.trim() || "No response.",
              loading: false,
            };
          } catch {
            return {
              model,
              content: "Something went wrong.",
              loading: false,
            };
          }
        }),
      );

      setMultiRounds((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) last.responses = results;
        return next;
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Unable to get a response.");

      const payload = (await response.json()) as { text?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.text?.trim() || "I couldn't generate a response.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            "Something went wrong while generating the reply. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isChatting = messages.length > 0;
  const showMultiColumns = isMultiChat;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (showMultiColumns) {
    const columnCount = AVAILABLE_MODELS.length;
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-4">
            <div
              className="flex gap-4 pb-6"
              style={{ minWidth: columnCount * 360 }}
            >
              {AVAILABLE_MODELS.map((model) => (
                <div
                  key={model.id}
                  className="flex w-[340px] min-w-[340px] max-w-[340px] shrink-0 flex-col rounded-xl border border-white/10 bg-[#0E0E12]"
                >
                  {/* Column header: icon, name + dropdown, bookmark, toggle */}
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/10 border border-violet/20">
                      <MessageSquare className="h-4 w-4 text-violet-400" />
                    </div>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-1 rounded-lg py-1 pr-1 text-left text-sm font-bold text-text hover:bg-white/5"
                    >
                      <span className="truncate">{model.name}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text"
                      aria-label="Bookmark"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                    <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer">
                      <input type="checkbox" className="peer sr-only" defaultChecked />
                      <span className="absolute inset-0 rounded-full bg-white/10 transition-colors peer-checked:bg-violet-500/30" />
                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-500 transition-all peer-checked:left-4 peer-checked:bg-violet-500" />
                    </label>
                  </div>
                  {/* Column content: rounds */}
                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                    {multiRounds.length === 0 && (
                      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-sm text-text-muted">
                        Send a message below to see all models respond.
                      </div>
                    )}
                    {multiRounds.map((round, roundIdx) => {
                      const resp = round.responses.find(
                        (r) => r.model.id === model.id
                      );
                      return (
                        <div key={roundIdx} className="flex flex-col gap-3">
                          <div className="flex justify-end">
                            <div className="max-w-[95%] rounded-2xl bg-[#2F2F2F] px-4 py-2.5 text-sm text-text">
                              {round.user}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-text-muted">
                              {resp?.loading ? (
                                <div className="flex items-center gap-1.5 py-2">
                                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                                </div>
                              ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {resp?.content ?? "—"}
                                </ReactMarkdown>
                              )}
                            </div>
                            {resp && !resp.loading && (
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(resp.content)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text"
                                  aria-label="Copy"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text"
                                  aria-label="Good response"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text"
                                  aria-label="Bad response"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text"
                                  aria-label="Download"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom: Generate Consensus + input */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[var(--bg)]/95 px-4 py-4 backdrop-blur-sm">
            <div className="mx-auto max-w-4xl">
              <p className="mb-3 text-sm text-text-muted">
                Want one combined answer from all models?
              </p>
              <button
                type="button"
                className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-white/10 hover:text-text"
              >
                Generate Consensus →
              </button>
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="Ask me anything..."
                showModelSelector
                compact
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {isChatting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <button
              type="button"
              onClick={handleNewChat}
              className="mb-6 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-text-muted transition-colors hover:bg-white/10 hover:text-text"
            >
              New Chat
            </button>
            <ChatMessages messages={messages} isLoading={isLoading} />
          </div>
          <div className="shrink-0 border-t border-white/[0.06] bg-[var(--bg)]/95 px-4 py-4 backdrop-blur-sm lg:pl-4">
            <div className="mx-auto max-w-3xl">
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleSubmit}
                placeholder="Ask anything, create anything..."
                showModelSelector
                compact
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-14">
          <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet/20 bg-violet/5">
            <BotIcon className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-text sm:text-4xl">
            {agentLabel}
          </h1>
          <p className="mt-2 text-text-muted">
            Ask anything, create anything.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Ask anything, create anything..."
              showModelSelector
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
