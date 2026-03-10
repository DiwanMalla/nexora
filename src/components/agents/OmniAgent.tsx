/**
 * OmniAgent — The "best answer" agent that uses the Omni router to select
 * a Groq model by prompt intent, streams the response via useChat, and
 * displays routing metadata (model + reason) from response headers.
 *
 * Now includes a live Pipeline Tracker that shows the processing steps
 * (Query Analysis → Web Search → Deep Analysis → Fact Check → Research → Generate).
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ChatMessages,
  type ReplyImage,
  type ReplyImageState,
  type RoutingMetadata,
} from "@/components/chat/ChatMessages";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import type { ChatMessage } from "@/types";
import {
  Bot as BotIcon,
  Search,
  Brain,
  ShieldCheck,
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStepData {
  name: string;
  status: "done" | "error" | "skipped";
  detail?: string;
  durationMs?: number;
}

interface PipelineData {
  steps: PipelineStepData[];
  totalMs: number;
  category: string;
  webSearchUsed: boolean;
  sourcesCount: number;
  imagesCount: number;
  factCheckVerified: boolean | null;
}

// ─── Pipeline step configuration ────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "query_analysis", label: "Analyzing Query", icon: Search },
  { key: "web_search", label: "Web Search", icon: Search },
  { key: "deep_analysis", label: "Deep Analysis", icon: Brain },
  { key: "fact_check", label: "Fact Checking", icon: ShieldCheck },
  { key: "research", label: "Research Synthesis", icon: BookOpen },
  { key: "generating", label: "Generating Answer", icon: Sparkles },
] as const;

// ─── Pipeline Tracker Component ─────────────────────────────────────────────

function PipelineTracker({
  activeStepIndex,
  pipelineData,
  isComplete,
}: {
  activeStepIndex: number;
  pipelineData: PipelineData | null;
  isComplete: boolean;
}) {
  return (
    <div className="mx-auto mb-4 w-full max-w-4xl animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="rounded-xl border border-border bg-bg-card/80 px-4 py-3 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20">
            <BotIcon className="h-3 w-3 text-violet-400" />
          </div>
          <span className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-text-muted">
            Pipeline Status
          </span>
          {pipelineData && (
            <span className="ml-auto text-[10px] text-text-dim">
              {pipelineData.totalMs}ms total
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            let status: "waiting" | "active" | "done" | "error" | "skipped" =
              "waiting";

            if (isComplete && pipelineData) {
              // Use actual data from the server
              const serverStep = pipelineData.steps[idx];
              status = serverStep?.status ?? "done";
            } else if (idx < activeStepIndex) {
              status = "done";
            } else if (idx === activeStepIndex) {
              status = "active";
            }

            const serverStep = pipelineData?.steps[idx];

            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-300",
                  status === "active" && "bg-violet-500/10",
                  status === "done" && "opacity-80",
                  status === "waiting" && "opacity-40",
                  status === "skipped" && "opacity-40",
                  status === "error" && "bg-red-500/10",
                )}
              >
                {/* Status icon */}
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {status === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  ) : status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : status === "error" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  ) : status === "skipped" ? (
                    <SkipForward className="h-3.5 w-3.5 text-text-dim" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-text-dim" />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-[var(--text-xs)] font-medium",
                    status === "active" && "text-violet-300",
                    status === "done" && "text-text-muted",
                    status === "error" && "text-red-300",
                    (status === "waiting" || status === "skipped") &&
                      "text-text-dim",
                  )}
                >
                  {step.label}
                </span>

                {/* Detail from server */}
                {serverStep?.detail && isComplete && (
                  <span className="ml-auto max-w-[50%] truncate text-[10px] text-text-dim">
                    {serverStep.detail}
                  </span>
                )}

                {/* Duration */}
                {serverStep?.durationMs != null && isComplete && (
                  <span className="text-[10px] text-text-dim">
                    {serverStep.durationMs}ms
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTextFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
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
  const { selectedAgent, setSelectedAgent } = useWorkspace();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [routedModel, setRoutedModel] = useState<string | null>(null);
  const [routedReason, setRoutedReason] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [pipelineStepIndex, setPipelineStepIndex] = useState(0);
  const [replyImages, setReplyImages] = useState<ReplyImage[]>([]);
  const [imageSearchState, setImageSearchState] =
    useState<ReplyImageState>("idle");
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [latestQuery, setLatestQuery] = useState<string | null>(null);
  const pipelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageRequestRef = useRef(0);

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
          const res = await fetch(url, init);
          if (res.ok) {
            setRoutedModel(res.headers.get("X-Omni-Model"));
            setRoutedReason(res.headers.get("X-Omni-Reason"));

            // Parse pipeline metadata from header
            const pipelineHeader = res.headers.get("X-Pipeline-Data");
            if (pipelineHeader) {
              try {
                const data = JSON.parse(pipelineHeader) as PipelineData;
                setPipelineData(data);
              } catch {
                // ignore parse errors
              }
            }
          }
          return res;
        },
      }),
    [],
  );

  const { messages: uiMessages, sendMessage, status } = useChat({ transport });

  const messages = useMemo(
    () => uiMessagesToChatMessages(uiMessages),
    [uiMessages],
  );
  const isLoading = status === "submitted" || status === "streaming";
  const isSubmitted = status === "submitted";
  const isStreaming = status === "streaming";
  const isChatting = messages.length > 0 || isLoading;

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Animate pipeline steps while waiting for the server
  useEffect(() => {
    if (isSubmitted) {
      // Reset pipeline state for new request
      setPipelineData(null);
      setPipelineStepIndex(0);

      // Animate through steps at realistic intervals
      const stepTimings = [400, 1200, 800, 600, 500, 300]; // ms per step
      let currentStep = 0;

      const advanceStep = () => {
        currentStep++;
        if (currentStep < PIPELINE_STEPS.length) {
          setPipelineStepIndex(currentStep);
          pipelineTimerRef.current = setTimeout(
            advanceStep,
            stepTimings[currentStep] ?? 500,
          );
        }
      };

      pipelineTimerRef.current = setTimeout(advanceStep, stepTimings[0] ?? 500);

      return () => {
        if (pipelineTimerRef.current) {
          clearTimeout(pipelineTimerRef.current);
        }
      };
    }

    // When streaming starts, jump to the generating step
    if (isStreaming) {
      if (pipelineTimerRef.current) {
        clearTimeout(pipelineTimerRef.current);
      }
      setPipelineStepIndex(PIPELINE_STEPS.length - 1);
    }
  }, [isSubmitted, isStreaming]);

  // Auto-submit initial query from ?q=
  useEffect(() => {
    const initQ = searchParams.get("q");
    if (!initQ) return;
    if (uiMessages.length > 0) return;

    startImageSearch(initQ);
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

      startImageSearch(text);

      setInput("");
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage, startImageSearch],
  );

  const routingMetadata: RoutingMetadata | null =
    routedModel != null && routedReason != null
      ? { model: routedModel, reason: routedReason }
      : null;

  // Show pipeline tracker during loading or right after it completes
  const showPipelineTracker = isLoading;
  const isPipelineComplete =
    isStreaming || (!isLoading && pipelineData != null);

  return (
    <div className="flex h-full flex-col">
      {isChatting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 pb-32"
          >
            {/* Pipeline Tracker — shows above messages while processing */}
            {showPipelineTracker && (
              <PipelineTracker
                activeStepIndex={pipelineStepIndex}
                pipelineData={pipelineData}
                isComplete={isPipelineComplete}
              />
            )}
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              agentId="omni"
              lastMessageRef={lastMessageRef}
              routingMetadata={routingMetadata}
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
