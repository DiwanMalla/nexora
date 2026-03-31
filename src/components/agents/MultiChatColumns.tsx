/**
 * MultiChatColumns — Side-by-side multi-model chat comparison view.
 *
 * Extracted from GenericAgent to separate concerns. Handles:
 *   - Per-model column headers with logos and enable/disable toggles
 *   - Parallel API requests to multiple models
 *   - Column collapse/expand with smooth transitions
 *   - Shared command bar at the bottom
 */

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { sendMultiModelMessages } from "@/lib/api";
import { CommandBar } from "@/components/chat/CommandBar";
import { useWorkspace } from "@/components/dashboard/WorkspaceProvider";
import { useAiChatQualityPanel } from "@/lib/chat/markdown-panel-heuristic";
import { MessageActions } from "@/components/chat/MessageActions";
import type { AIModel, ChatMessage, MultiChatRound } from "@/types";

// ─── Utilities ──────────────────────────────────────────────────

/** Returns the logo image path for a given model, or null if none. */
function getModelLogo(model: AIModel): string | null {
  const lcName = model.name.toLowerCase();
  const lcProvider = model.provider?.toLowerCase() || "";

  const LOGO_MAP: [string[], string][] = [
    [["gpt", "openai"], "/ai-provider logo/openai.png"],
    [["llama", "meta"], "/ai-provider logo/meta ai.png"],
    [["gemini", "google"], "/ai-provider logo/google.webp"],
    [["deepseek"], "/ai-provider logo/deepseek.jpg"],
    [["qwen"], "/ai-provider logo/qwen.png"],
    [["kimi", "moonshot"], "/ai-provider logo/moonshot.png"],
    [["mistral"], "/ai-provider logo/mistral.webp"],
    [["claude", "anthropic"], "/ai-provider logo/anthropic.png"],
    [["cohere"], "/ai-provider logo/cohere.png"],
  ];

  for (const [keywords, path] of LOGO_MAP) {
    if (keywords.some((k) => lcName.includes(k) || lcProvider.includes(k))) {
      return path;
    }
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────

interface MultiChatColumnsProps {
  input: string;
  messages: ChatMessage[];
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────

export function MultiChatColumns({
  input,
  messages,
  handleInputChange,
  handleSubmit: parentSubmit,
}: MultiChatColumnsProps) {
  const { chatWebSearchEnabled, selectedAgent } = useWorkspace();
  const [multiRounds, setMultiRounds] = useState<MultiChatRound[]>([]);
  const [columnEnabled, setColumnEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(AVAILABLE_MODELS.map((m) => [m.id, true])),
  );

  const setColumnEnabledById = useCallback(
    (modelId: string, enabled: boolean) => {
      setColumnEnabled((prev) => ({ ...prev, [modelId]: enabled }));
    },
    [],
  );

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    // Create a new round with loading placeholders
    const newRound: MultiChatRound = {
      user: query,
      responses: AVAILABLE_MODELS.map((m) => ({
        model: m,
        content: "",
        loading: true,
      })),
    };
    setMultiRounds((prev) => [...prev, newRound]);

    // Pass query up so the input gets cleared
    await parentSubmit(e);

    // Fire all models in parallel
    const apiMessages = [...messages, { role: "user", content: query }].map(
      (msg) => ({ role: msg.role, content: msg.content }),
    );

    const results = await sendMultiModelMessages(
      apiMessages,
      AVAILABLE_MODELS.map((m) => m.id),
      { webSearch: chatWebSearchEnabled },
    );

    setMultiRounds((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) {
        last.responses = AVAILABLE_MODELS.map((model) => {
          const result = results.find((r) => r.modelId === model.id);
          return {
            model,
            content: result?.text || "No response.",
            loading: false,
          };
        });
      }
      return next;
    });
  };

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
              const logoUrl = getModelLogo(model);

              return (
                <div key={model.id} className="flex shrink-0 items-stretch">
                  {/* Column divider */}
                  {index > 0 && (
                    <div
                      className={cn(
                        "w-px shrink-0 self-stretch",
                        enabled
                          ? "bg-surface-overlay-strong"
                          : "bg-surface-overlay",
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
                    <ColumnHeader
                      model={model}
                      logoUrl={logoUrl}
                      enabled={enabled}
                      onToggle={(checked) =>
                        setColumnEnabledById(model.id, checked)
                      }
                    />

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
                            <RoundView
                              key={roundIdx}
                              userMessage={round.user}
                              response={resp}
                              selectedAgent={selectedAgent}
                            />
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

        {/* Command bar */}
        {multiHasMessages ? (
          <div
            className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md"
            style={{ left: "var(--sidebar-width, 15rem)" }}
          >
            <div className="mx-auto max-w-4xl">
              <CommandBar
                input={input}
                handleInputChange={handleInputChange}
                onSubmit={handleMultiSubmit}
                placeholder="Ask me anything..."
                showModelSelector
                compact
              />
            </div>
          </div>
        ) : (
          <div
            className="fixed z-30 flex left-[var(--sidebar-width)] right-0 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md"
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
                onSubmit={handleMultiSubmit}
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

// ─── Sub-components ─────────────────────────────────────────────

/** Column header with model name, logo, link, and enable toggle. */
function ColumnHeader({
  model,
  logoUrl,
  enabled,
  onToggle,
}: {
  model: AIModel;
  logoUrl: string | null;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
}) {
  if (!enabled) {
    return (
      <div className="flex flex-col justify-center items-center px-0 py-0 h-[64px] gap-1.5 min-h-[64px]">
        {logoUrl ? (
          <div className="relative h-[22px] w-[22px] overflow-hidden rounded-[4px] bg-surface-invert flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
            <Image
              src={logoUrl}
              alt={model.name}
              fill
              className={cn(
                "object-contain p-0.5",
                logoUrl.includes("openai") && "invert",
              )}
            />
          </div>
        ) : (
          <MessageSquare className="h-[22px] w-[22px] text-text-muted hover:text-text transition-colors" />
        )}
        <Maximize2 className="h-2.5 w-2.5 text-text-dim mt-2" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-transparent px-4 py-4 min-h-[64px]">
      <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 transition-colors hover:bg-surface-overlay relative">
        {logoUrl ? (
          <div className="relative h-4 w-4 overflow-hidden rounded-[4px] bg-surface-invert flex items-center justify-center shrink-0">
            <Image
              src={logoUrl}
              alt={model.name}
              fill
              className={cn(
                "object-contain p-0.5",
                logoUrl.includes("openai") && "invert",
              )}
            />
          </div>
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0 text-surface-invert-text" />
        )}
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
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div className="peer h-5 w-9 rounded-full bg-surface-overlay-strong after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-invert after:transition-all after:content-[''] peer-checked:bg-accent-success peer-focus:outline-none peer-checked:after:translate-x-full border border-border" />
      </label>
    </div>
  );
}

/** A single round of multi-model Q&A within a column. */
function RoundView({
  userMessage,
  response,
  selectedAgent,
}: {
  userMessage: string;
  response?: { content: string; loading?: boolean };
  selectedAgent: string;
}) {
  const content = response?.content ?? "—";
  const qualityPanel =
    !response?.loading && useAiChatQualityPanel(selectedAgent, content);

  return (
    <div className="flex flex-col gap-3">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[95%] rounded-2xl bg-bg-card px-4 py-2.5 text-sm text-text">
          {userMessage}
        </div>
      </div>

      {/* Model response */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            qualityPanel
              ? "typography-prose ai-chat-answer-panel text-text"
              : "bg-surface-overlay-strong text-text-muted",
          )}
        >
          {response?.loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
        {response && !response.loading && (
          <div className="pt-1">
            <MessageActions content={response.content} />
          </div>
        )}
      </div>
    </div>
  );
}
