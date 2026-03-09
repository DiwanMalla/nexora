"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { getCompetingModelIds } from "@/lib/settings";
import { randomUUID } from "@/lib/utils";
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
import Image from "next/image";

function getModelLogo(model: AIModel) {
  const lcName = model.name.toLowerCase();
  const lcProvider = model.provider?.toLowerCase() || "";
  if (lcName.includes("gpt") || lcProvider.includes("openai")) return "/ai-provider logo/openai.png";
  if (lcName.includes("llama") || lcProvider.includes("meta")) return "/ai-provider logo/meta ai.png";
  if (lcName.includes("gemini") || lcProvider.includes("google")) return "/ai-provider logo/google.webp";
  if (lcName.includes("deepseek")) return "/ai-provider logo/deepseek.jpg";
  if (lcName.includes("qwen") || lcProvider.includes("qwen")) return "/ai-provider logo/qwen.png";
  if (lcName.includes("kimi") || lcProvider.includes("moonshot")) return "/ai-provider logo/moonshot.png";
  if (lcName.includes("mistral") || lcProvider.includes("mistral")) return "/ai-provider logo/mistral.webp";
  if (lcName.includes("claude") || lcProvider.includes("anthropic")) return "/ai-provider logo/anthropic.png";
  if (lcName.includes("cohere") || lcProvider.includes("cohere")) return "/ai-provider logo/cohere.png";
  return null;
}


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
      const newId = randomUUID();
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
            const data = (await res.json()) as { text?: string; model?: string };
            if (data.model) {
              console.log("[Nexora] Model from API:", data.model);
            }
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

      const payload = (await response.json()) as {
        text?: string;
        model?: string;
        error?: string;
        details?: string;
      };
      if (!response.ok) {
        const errMsg =
          payload.details || payload.error || "Unable to get a response.";
        throw new Error(errMsg);
      }
      if (payload.model) {
        console.log("[Nexora] Model from API:", payload.model);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.text?.trim() || "I couldn't generate a response.",
          model: selectedModel,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `Something went wrong. ${message} Try another model or try again.`,
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
        lastMessageRef.current?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

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
    const multiHasMessages = multiRounds.length > 0;

    return (
      <div className="flex h-full flex-col">
        <div className="relative flex flex-1 flex-col min-h-0">
          <div
            className={cn(
              "flex-1 overflow-x-auto overflow-y-auto px-4 py-4",
              multiHasMessages ? "pb-32" : "pb-4",
            )}
          >
            <div className="flex h-full pb-6">
              {AVAILABLE_MODELS.map((model, index) => {
                const enabled = columnEnabled[model.id] !== false;
                return (
                  <div key={model.id} className="flex shrink-0 items-stretch">
                    {index > 0 && (
                      <div
                        className={cn(
                          "w-px shrink-0 self-stretch",
                          enabled ? "bg-surface-overlay-strong" : "bg-surface-overlay",
                        )}
                        aria-hidden
                      />
                    )}
                    <div
                      className={cn(
                        "flex flex-col transition-all duration-300 ease-in-out",
                        enabled
                          ? "w-[min(420px,85vw)] min-w-[min(420px,85vw)] max-w-[min(420px,85vw)]"
                          : "w-[60px] min-w-[60px] max-w-[60px] items-center cursor-pointer hover:bg-surface-overlay opacity-80",
                      )}
                      onClick={() => {
                        if (!enabled) setColumnEnabledById(model.id, true);
                      }}
                    >
                      {/* Column header */}
                      <div
                        className={cn(
                          "flex items-center gap-3 border-b border-transparent px-4 py-4 min-h-[64px]",
                          !enabled &&
                            "flex-col justify-center px-0 py-0 h-[64px] gap-1.5",
                        )}
                      >
                        {enabled ? (
                          <>
                            <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 transition-colors hover:bg-surface-overlay relative">
                              {(() => {
                                const logoUrl = getModelLogo(model);
                                return logoUrl ? (
                                  <div className="relative h-4 w-4 overflow-hidden rounded-[4px] bg-surface-invert flex items-center justify-center shrink-0">
                                    <Image src={logoUrl} alt={model.name} fill className={cn("object-contain p-0.5", logoUrl.includes("openai") && "invert")} />
                                  </div>
                                ) : (
                                  <MessageSquare className="h-4 w-4 shrink-0 text-surface-invert-text" />
                                );
                              })()}
                              <span className="truncate text-sm font-medium text-text">
                                {model.name}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                            </div>

                            <div className="flex-1" />

                            <button className="text-text-muted hover:text-text transition-colors">
                              <ExternalLink className="h-[15px] w-[15px]" />
                            </button>

                            <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={enabled}
                                onChange={(e) =>
                                  setColumnEnabledById(
                                    model.id,
                                    e.target.checked,
                                  )
                                }
                              />
                              <div className="peer h-5 w-9 rounded-full bg-surface-overlay-strong after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-invert after:transition-all after:content-[''] peer-checked:bg-accent-success peer-focus:outline-none peer-checked:after:translate-x-full border border-border"></div>
                            </label>
                          </>
                        ) : (
                          <>
                            {(() => {
                                const logoUrl = getModelLogo(model);
                                return logoUrl ? (
                                  <div className="relative h-[22px] w-[22px] overflow-hidden rounded-[4px] bg-surface-invert flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                                    <Image src={logoUrl} alt={model.name} fill className={cn("object-contain p-0.5", logoUrl.includes("openai") && "invert")} />
                                  </div>
                                ) : (
                                  <MessageSquare className="h-[22px] w-[22px] text-text-muted hover:text-text transition-colors" />
                                );
                            })()}
                            <Maximize2 className="h-2.5 w-2.5 text-text-dim mt-2" />
                          </>
                        )}
                      </div>
                      {/* Column content */}
                      {enabled && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 border-t border-border">
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
                              <div
                                key={roundIdx}
                                className="flex flex-col gap-3"
                              >
                                <div className="flex justify-end">
                                  <div className="max-w-[95%] rounded-2xl bg-bg-card px-4 py-2.5 text-sm text-text">
                                    {round.user}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="rounded-2xl bg-surface-overlay-strong px-4 py-3 text-sm text-text-muted">
                                    {resp?.loading ? (
                                      <div className="flex items-center gap-1.5 py-2">
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                                      </div>
                                    ) : (
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                      >
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
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-overlay hover:text-text"
                                        aria-label="Copy"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-overlay hover:text-text"
                                        aria-label="Good response"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-overlay hover:text-text"
                                        aria-label="Bad response"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-overlay hover:text-text"
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
          {/* Command bar: centered when empty, fixed at bottom when user has sent messages */}
          {multiHasMessages ? (
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
          ) : (
            <div
              className="fixed z-30 flex  left-[var(--sidebar-width)] right-0 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                marginLeft: "calc(var(--sidebar-width, 15rem) / 2)",
              }}
            >
              <div className="mx-auto w-full max-w-5xl">
                <CommandBar
                  input={input}
                  handleInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  placeholder="Ask me anything..."
                  showModelSelector
                  compact
                  wide
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {isChatting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 pb-32"
          >
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
          <h1 className="font-display text-[var(--text-3xl)] font-bold tracking-tight text-text sm:text-[var(--text-4xl)]">
            {agentLabel}
          </h1>
          <p className="mt-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text-muted">
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
