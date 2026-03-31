/**
 * OmniAgent — Clean chat-style streaming interface.
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ChatMessages,
  type ReplyImage,
  type ReplyImageState,
} from "@/components/chat/ChatMessages";
import { ConversationTitleBar } from "@/components/chat/ConversationTitleBar";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import type { ChatMessage } from "@/types";
import { Bot as BotIcon } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function shouldFetchImagesForQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;

  // Skip images for core technical/repo/debug tasks.
  if (
    /\b(code|coding|debug|bug|stack trace|repo|repository|github|package\.json|readme|api|endpoint|env|dotenv|database|sql|backend|typescript|javascript|react|next\.?js)\b/i.test(
      q,
    )
  ) {
    return false;
  }

  // Fetch images only when visual intent is explicit.
  return /\b(image|images|visual|visually|screenshot|screenshots|logo|logos|ui|design|inspiration|diagram|photo|photos|brand|product)\b/i.test(
    q,
  );
}

function getTextFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type PipelineHeaderStep = {
  name: string;
  status: "done" | "skipped" | "running";
};

type PipelineHeaderPayload = {
  steps?: PipelineHeaderStep[];
  retrievalStrategy?: string;
  retrievalQuality?: "high" | "limited" | "none";
  retrievalQualityNote?: string | null;
};

type StrategyProfileKey =
  | "repo_fetch"
  | "direct_url_fetch"
  | "web_search"
  | "none";

const PIPELINE_STEP_ORDER = [
  "Query Analysis",
  "Retrieval",
  "Deep Analysis",
  "Fact Check",
  "Research Synthesis",
];

const PROGRESS_PROFILES: Record<StrategyProfileKey, string[]> = {
  repo_fetch: [
    "Inspecting repository",
    "Reading project files",
    "Extracting key details",
    "Preparing summary",
  ],
  direct_url_fetch: [
    "Opening page",
    "Reading content",
    "Extracting key sections",
    "Preparing summary",
  ],
  web_search: [
    "Analyzing your request",
    "Searching the web",
    "Reviewing sources",
    "Preparing answer",
  ],
  none: [
    "Understanding your question",
    "Reasoning through options",
    "Preparing answer",
  ],
};

function detectStrategyFromQuery(query: string): StrategyProfileKey {
  const q = query.toLowerCase().trim();
  if (/\bgithub\.com\/[^/\s]+\/[^/\s]+/i.test(q)) return "repo_fetch";
  if (/https?:\/\/\S+/i.test(q)) return "direct_url_fetch";
  if (
    /\b(latest|today|current|recent|news|price|pricing|compare|vs)\b/i.test(q)
  ) {
    return "web_search";
  }
  return "none";
}

function normalizeStrategy(value: string | undefined): StrategyProfileKey {
  if (value === "repo_fetch") return "repo_fetch";
  if (value === "direct_url_fetch") return "direct_url_fetch";
  if (value === "web_search") return "web_search";
  return "none";
}

function getProfileSteps(strategy: StrategyProfileKey): string[] {
  return PROGRESS_PROFILES[strategy];
}

function uiMessagesToChatMessages(
  messages: Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>,
): ChatMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: getTextFromParts(m.parts),
    }));
}

// ─── Main component ─────────────────────────────────────────────────────────

export function OmniAgent() {
  const { selectedAgent, setSelectedAgent, omniProvider } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");
  const [input, setInput] = useState("");
  const [replyImages, setReplyImages] = useState<ReplyImage[]>([]);
  const [imageSearchState, setImageSearchState] =
    useState<ReplyImageState>("idle");
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [latestQuery, setLatestQuery] = useState<string | null>(null);
  const imageRequestRef = useRef(0);
  const conversationIdRef = useRef<string>(
    searchParams.get("id") ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `omni-${Date.now()}-${Math.random().toString(16).slice(2)}`),
  );
  const activeConversationId = conversationIdFromUrl ?? conversationIdRef.current;
  const omniProviderRef = useRef(omniProvider);
  const requestStartMsRef = useRef<number | null>(null);
  const headersAtMsRef = useRef<number | null>(null);
  const firstVisibleTokenMsRef = useRef<number | null>(null);
  const pendingQueryRef = useRef<string>("");
  const currentStrategyRef = useRef<StrategyProfileKey>("none");
  const lastSubmissionRef = useRef<{ text: string; at: number } | null>(null);
  const clientStreamStatsRef = useRef<{
    updateCount: number;
    charsDeltaSum: number;
    intervalSumMs: number;
    intervalCount: number;
    maxIntervalMs: number;
    lastAtMs: number | null;
    lastAssistantLen: number;
  } | null>(null);
  const [pipelineProgressSteps, setPipelineProgressSteps] = useState<
    Array<{ label: string; done: boolean }>
  >([]);
  const [activeStepLabel, setActiveStepLabel] = useState<string | undefined>(
    undefined,
  );
  const [retrievalQualityNotice, setRetrievalQualityNotice] = useState<
    string | null
  >(null);

  useEffect(() => {
    omniProviderRef.current = omniProvider;
  }, [omniProvider]);

  const startImageSearch = useCallback((query: string) => {
    const currentImageRequest = ++imageRequestRef.current;
    setLatestQuery(query);
    setReplyImages([]);
    setImageSearchError(null);
    setImageSearchState("loading");

    void fetch("/api/omni-agent/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          images?: ReplyImage[];
          skipped?: boolean;
          error?: string;
        };

        if (currentImageRequest !== imageRequestRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load related images.");
        }

        setReplyImages(payload.images ?? []);
        setImageSearchState(payload.skipped ? "idle" : "done");
      })
      .catch((error: unknown) => {
        if (currentImageRequest !== imageRequestRef.current) {
          return;
        }

        setImageSearchError(
          error instanceof Error
            ? error.message
            : "Unable to load related images.",
        );
        setImageSearchState("error");
      });
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/omni-agent",
        fetch: async (url, init) => {
          if (requestStartMsRef.current == null) {
            requestStartMsRef.current = Date.now();
            headersAtMsRef.current = null;
            firstVisibleTokenMsRef.current = null;
            clientStreamStatsRef.current = {
              updateCount: 0,
              charsDeltaSum: 0,
              intervalSumMs: 0,
              intervalCount: 0,
              maxIntervalMs: 0,
              lastAtMs: null,
              lastAssistantLen: 0,
            };
            console.log("[OmniTiming] request sent");
          }
          const nextHeaders = new Headers(init?.headers);
          nextHeaders.set("x-omni-provider", omniProviderRef.current);
          const requestId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `omni-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          nextHeaders.set("x-omni-request-id", requestId);
          nextHeaders.set("x-conversation-id", conversationIdRef.current);
          const optimisticStrategy = detectStrategyFromQuery(
            pendingQueryRef.current,
          );
          currentStrategyRef.current = optimisticStrategy;
          const optimisticSteps = getProfileSteps(optimisticStrategy);
          setPipelineProgressSteps([]);
          setActiveStepLabel(optimisticSteps[0]);
          setRetrievalQualityNotice(null);
          const res = await fetch(url, {
            ...init,
            headers: nextHeaders,
          });
          const pipelineHeader = res.headers.get("X-Pipeline-Data");
          if (pipelineHeader) {
            try {
              const decoded = decodeURIComponent(pipelineHeader);
              const parsed = JSON.parse(decoded) as PipelineHeaderPayload;
              const strategy = normalizeStrategy(parsed.retrievalStrategy);
              currentStrategyRef.current = strategy;
              if (parsed.retrievalQuality === "limited") {
                setRetrievalQualityNotice(
                  parsed.retrievalQualityNote ??
                    "Limited page content detected; answer may be partial.",
                );
              } else if (parsed.retrievalQuality === "none") {
                setRetrievalQualityNotice(
                  parsed.retrievalQualityNote ??
                    "No usable external content detected.",
                );
              }
              const profileSteps = getProfileSteps(strategy);
              const retrieved = parsed.steps ?? [];
              const doneStepCount = PIPELINE_STEP_ORDER.reduce(
                (count, name) => {
                  const match = retrieved.find((step) => step.name === name);
                  return match && match.status === "done" ? count + 1 : count;
                },
                0,
              );
              const doneSteps = profileSteps
                .slice(0, Math.min(doneStepCount, profileSteps.length))
                .map((label) => ({ label, done: true }));
              setPipelineProgressSteps(doneSteps);
              const activeIndex = Math.min(
                doneStepCount,
                profileSteps.length - 1,
              );
              setActiveStepLabel(profileSteps[activeIndex]);
            } catch {
              // Keep optimistic progress if header parsing fails.
            }
          }
          if (requestStartMsRef.current != null) {
            headersAtMsRef.current = Date.now();
            console.log(
              `[OmniTiming] response headers in ${headersAtMsRef.current - requestStartMsRef.current}ms (req=${requestId})`,
            );
          }
          return res;
        },
      }),
    [],
  );

  const {
    messages: uiMessages,
    sendMessage,
    status,
    setMessages: setUiMessages,
  } = useChat({ transport });

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (!idFromUrl) return;
    if (conversationIdRef.current !== idFromUrl) {
      conversationIdRef.current = idFromUrl;
    }
  }, [searchParams]);

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (!idFromUrl) return;
    let active = true;
    void fetch(`/api/history/${encodeURIComponent(idFromUrl)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          messages?: Array<{
            id: string;
            role: "user" | "assistant" | "system" | "tool";
            content: string;
          }>;
        };
        if (!active || !res.ok) return;
        const hydrated = (payload.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text", text: m.content }],
          }));
        setUiMessages(hydrated as Parameters<typeof setUiMessages>[0]);
      })
      .catch(() => {
        // keep current ui state if history fetch fails
      });
    return () => {
      active = false;
    };
  }, [searchParams, setUiMessages]);

  const messages = useMemo(
    () => uiMessagesToChatMessages(uiMessages),
    [uiMessages],
  );
  const isLoading = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (status !== "submitted") return;
    setPipelineProgressSteps([]);
    const profileSteps = getProfileSteps(currentStrategyRef.current);
    let stepIndex = 0;
    setActiveStepLabel(profileSteps[stepIndex]);
    const id = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, profileSteps.length - 1);
      setPipelineProgressSteps(
        profileSteps.slice(0, stepIndex).map((label) => ({
          label,
          done: true,
        })),
      );
      setActiveStepLabel(profileSteps[stepIndex]);
    }, 1300);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === "streaming") {
      setActiveStepLabel("Writing response");
    }
    if (status === "ready") {
      setActiveStepLabel(undefined);
      setPipelineProgressSteps([]);
      setRetrievalQualityNotice(null);
    }
  }, [status]);

  const loadingHint =
    status === "submitted"
      ? retrievalQualityNotice
        ? `Nexora is working... ${retrievalQualityNotice}`
        : "Nexora is working..."
      : imageSearchState === "loading"
        ? "Writing response... loading related visuals..."
        : "Writing response...";
  const isChatting = messages.length > 0 || isLoading;

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      status === "streaming" &&
      last?.role === "assistant" &&
      last.content.trim().length > 0 &&
      requestStartMsRef.current != null &&
      firstVisibleTokenMsRef.current == null
    ) {
      firstVisibleTokenMsRef.current = Date.now();
      console.log(
        `[OmniTiming] first visible token in ${firstVisibleTokenMsRef.current - requestStartMsRef.current}ms`,
      );
    }

    // Client-side chunk diagnostics: count how often the assistant text
    // grows (as a proxy for "UI chunk updates" and re-render cadence).
    if (status === "streaming" && last?.role === "assistant") {
      const stats = clientStreamStatsRef.current;
      if (stats) {
        const len = last.content.length;
        if (len > stats.lastAssistantLen) {
          const now = Date.now();
          const delta = len - stats.lastAssistantLen;
          stats.updateCount += 1;
          stats.charsDeltaSum += delta;
          if (stats.lastAtMs != null) {
            const interval = now - stats.lastAtMs;
            stats.intervalSumMs += interval;
            stats.intervalCount += 1;
            stats.maxIntervalMs = Math.max(stats.maxIntervalMs, interval);
          }
          stats.lastAtMs = now;
          stats.lastAssistantLen = len;
        }
      }
    }
  }, [messages, status]);

  useEffect(() => {
    if (status === "ready" && requestStartMsRef.current != null) {
      const doneMs = Date.now() - requestStartMsRef.current;
      console.log(`[OmniTiming] response complete in ${doneMs}ms`);
      const stats = clientStreamStatsRef.current;
      if (stats) {
        console.log(
          `[OmniStreamClient] updates=${stats.updateCount} avgChunkChars=${
            stats.updateCount
              ? (stats.charsDeltaSum / stats.updateCount).toFixed(1)
              : "0"
          } avgIntervalMs=${
            stats.intervalCount
              ? Math.round(stats.intervalSumMs / stats.intervalCount)
              : "0"
          } maxIntervalMs=${stats.maxIntervalMs}`,
        );
      }
      requestStartMsRef.current = null;
    }
  }, [status]);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-submit initial query from ?q=
  useEffect(() => {
    const initQ = searchParams.get("q");
    if (!initQ) return;
    if (uiMessages.length > 0) return;
    pendingQueryRef.current = initQ;
    const freshStrategy = detectStrategyFromQuery(initQ);
    currentStrategyRef.current = freshStrategy;
    const freshSteps = getProfileSteps(freshStrategy);
    setPipelineProgressSteps([]);
    setActiveStepLabel(freshSteps[0]);
    setRetrievalQualityNotice(null);

    if (shouldFetchImagesForQuery(initQ)) {
      startImageSearch(initQ);
    } else {
      setLatestQuery(initQ);
      setReplyImages([]);
      setImageSearchError(null);
      setImageSearchState("idle");
    }
    void sendMessage({ text: initQ });

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, uiMessages.length, sendMessage, startImageSearch]);

  useEffect(() => {
    if (selectedAgent !== "omni") {
      setSelectedAgent("omni");
    }
  }, [selectedAgent, setSelectedAgent]);

  const handleInputChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLInputElement>,
    ) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      const now = Date.now();
      const recent = lastSubmissionRef.current;
      if (recent && recent.text === text && now - recent.at < 1500) {
        console.log("[Omni] duplicate submission suppressed");
        return;
      }
      lastSubmissionRef.current = { text, at: now };
      pendingQueryRef.current = text;
      const freshStrategy = detectStrategyFromQuery(text);
      currentStrategyRef.current = freshStrategy;
      const freshSteps = getProfileSteps(freshStrategy);
      setPipelineProgressSteps([]);
      setActiveStepLabel(freshSteps[0]);
      setRetrievalQualityNotice(null);

      if (shouldFetchImagesForQuery(text)) {
        startImageSearch(text);
      } else {
        setLatestQuery(text);
        setReplyImages([]);
        setImageSearchError(null);
        setImageSearchState("idle");
      }

      setInput("");
      if (!searchParams.get("id")) {
        router.replace(
          `/agents?type=omni&id=${encodeURIComponent(conversationIdRef.current)}`,
          { scroll: false },
        );
      }
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage, startImageSearch, router, searchParams],
  );

  return (
    <div className="flex h-full flex-col">
      {isChatting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 pb-32"
          >
            <ConversationTitleBar
              conversationId={activeConversationId}
              firstUserMessage={messages.find((m) => m.role === "user")?.content}
            />
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              loadingHint={loadingHint}
              progressSteps={pipelineProgressSteps}
              activeStepLabel={activeStepLabel}
              agentId="omni"
              lastMessageRef={lastMessageRef}
              replyImages={replyImages}
              replyImageQuery={latestQuery}
              replyImageState={imageSearchState}
              replyImageError={imageSearchError}
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
                placeholder="Ask Omni anything..."
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
            Omni Agent
          </h1>
          <p className="mt-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text-muted">
            Ask anything, create anything.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <CommandBar
              input={input}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Ask Omni anything..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
