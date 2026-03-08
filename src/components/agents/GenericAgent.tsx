"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { getCompetingModelIds } from "@/lib/settings";
import { AIModel, ChatMessage } from "@/types";
import {
  Bot as BotIcon,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Download,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MultiRound = {
  user: string;
  responses: { model: AIModel; content: string; loading?: boolean }[];
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  omni: "Omni Agent",
  aichat: "AI Chat",
  researcher: "Researcher",
  coder: "Developer",
  analyst: "Analyst",
};

function getAgentLabel(type: string | null): string {
  return (type && AGENT_TYPE_LABELS[type]) || "AI Chat";
}

export function GenericAgent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "aichat";
  const idFromUrl = searchParams.get("id");

  const { isMultiChat, selectedModel, selectedAgent, setSelectedAgent } =
    useWorkspace();

  useEffect(() => {
    if (type && type !== selectedAgent) {
      setSelectedAgent(type);
    }
  }, [type, selectedAgent, setSelectedAgent]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [multiRounds, setMultiRounds] = useState<MultiRound[]>([]);
  const [columnEnabled, setColumnEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(AVAILABLE_MODELS.map((m) => [m.id, true])),
  );
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

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
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => setInput(e.target.value);

  const handleNewChat = () => {
    setMessages([]);
    setMultiRounds([]);
    setChatTitle("");
    updateUrl(null);
  };

  const submitQuery = async (query: string) => {
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

    if (isMultiChat && selectedAgent !== "omni") {
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
      const enabledModels = getCompetingModelIds();
      const body: {
        model: string;
        messages: { role: string; content: string }[];
        enabledModels?: string[];
      } = {
        model: selectedModel,
        messages: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (enabledModels.length > 0) body.enabledModels = enabledModels;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuery(input.trim());
  };

  useEffect(() => {
    const initQ = searchParams.get("q");
    if (
      initQ &&
      messages.length === 0 &&
      multiRounds.length === 0 &&
      !isLoading
    ) {
      submitQuery(initQ);
      // Clean up URL so it doesn't re-trigger on refresh if they delete messages
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  }, [searchParams, messages.length, multiRounds.length, isLoading]);

  const isChatting = messages.length > 0;
  const showMultiColumns = isMultiChat && selectedAgent !== "omni";

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        lastMessageRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const setColumnEnabledById = useCallback(
    (modelId: string, enabled: boolean) => {
      setColumnEnabled((prev) => ({ ...prev, [modelId]: enabled }));
    },
    [],
  );

  if (showMultiColumns) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-4 pb-32">
            <div className="flex h-full pb-6">
              {AVAILABLE_MODELS.map((model, index) => {
                const enabled = columnEnabled[model.id] !== false;
                return (
                  <div key={model.id} className="flex shrink-0 items-stretch">
                    {index > 0 && (
                      <div
                        className={cn(
                          "w-px shrink-0 self-stretch",
                          enabled ? "bg-white/10" : "bg-white/5",
                        )}
                        aria-hidden
                      />
                    )}
                      <div className={cn(
                        "flex flex-col transition-all duration-300 ease-in-out",
                        enabled
                          ? "w-[min(420px,85vw)] min-w-[min(420px,85vw)] max-w-[min(420px,85vw)]"
                          : "w-[60px] min-w-[60px] max-w-[60px] items-center cursor-pointer hover:bg-white/[0.02] opacity-80",
                      )}
                      onClick={() => {
                        if (!enabled) setColumnEnabledById(model.id, true);
                      }}
                    >
                      {/* Column header */}
                      <div className={cn(
                        "flex items-center gap-3 border-b border-transparent px-4 py-4 min-h-[64px]",
                        !enabled && "flex-col justify-center px-0 py-0 h-[64px] gap-1.5"
                      )}>
                        {enabled ? (
                          <>
                            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors cursor-pointer px-3 py-1.5">
                              <MessageSquare className="h-4 w-4 shrink-0 text-white" />
                              <span className="truncate text-[13px] font-medium text-white">{model.name}</span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                            </div>
                            
                            <div className="flex-1" />

                            <button className="text-text-muted hover:text-white transition-colors">
                              <ExternalLink className="h-[15px] w-[15px]" />
                            </button>
                            
                            <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={enabled}
                                onChange={(e) =>
                                  setColumnEnabledById(model.id, e.target.checked)
                                }
                              />
                              <div className="peer h-5 w-9 rounded-full bg-white/10 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#20A05A] peer-focus:outline-none dark:border-gray-600 peer-checked:after:translate-x-full"></div>
                            </label>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-[22px] w-[22px] text-text-muted hover:text-white transition-colors" />
                            <Maximize2 className="h-2.5 w-2.5 text-text-dim" />
                          </>
                        )}
                      </div>
                      {/* Column content */}
                      {enabled && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 border-t border-white/5">
                          {multiRounds.length === 0 && (
                            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-sm text-text-muted">
                              Send a message below to see all models respond.
                            </div>
                          )}
                          {multiRounds.map((round, roundIdx) => {
                            const resp = round.responses.find(
                              (r) => r.model.id === model.id,
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
                                        onClick={() =>
                                          copyToClipboard(resp.content)
                                        }
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Bottom: fixed command bar */}
          <div
            className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md"
            style={{ left: "var(--sidebar-width, 15rem)" }}
          >
            <div className="mx-auto max-w-4xl">
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
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-6 pb-32">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              agentId={type || "aichat"}
              lastMessageRef={lastMessageRef}
            />
          </div>
          <div
            className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md lg:pl-4"
            style={{ left: "var(--sidebar-width, 15rem)" }}
          >
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
          <p className="mt-2 text-text-muted">Ask anything, create anything.</p>
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
