/**
 * ChatMessages — Renders the conversation thread.
 *
 * Displays user and assistant messages with markdown support,
 * action buttons, and a simple loading indicator.
 */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Hexagon } from "lucide-react";
import { cn, stripThinkBlocks, hasUnclosedThink } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { MessageActions } from "./MessageActions";

export interface RoutingMetadata {
  model: string;
  reason: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  agentId?: string;
  /** Ref attached to the last message so parent can scroll it into view. */
  lastMessageRef?: React.RefObject<HTMLDivElement | null>;
  /** Optional routing info (e.g. OmniAgent model + reason) shown below last assistant message. */
  routingMetadata?: RoutingMetadata | null;
}

/** Renders a single user message bubble. */
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="max-w-[80%] rounded-2xl bg-bg-card border border-border px-4 py-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text">
        {content}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-invert text-surface-invert-text text-[var(--text-xs)] font-semibold shadow-sm">
        DM
      </div>
    </div>
  );
}

/** Renders a single assistant message with markdown and actions. */
function AssistantMessage({
  content,
  model,
  showThinkingIndicator,
}: {
  content: string;
  model?: string;
  showThinkingIndicator?: boolean;
}) {
  const visibleContent = stripThinkBlocks(content);
  return (
    <div className="flex flex-col gap-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay-strong border border-border shadow-sm">
          <Hexagon className="h-4 w-4 text-text" />
        </div>
        <span className="text-[var(--text-base)] font-semibold text-text tracking-tight">
          Nexora
        </span>
      </div>

      {/* Thinking indicator (when model is inside <think> block during streaming) */}
      {showThinkingIndicator && (
        <div className="flex items-center gap-2 pl-11 text-[var(--text-sm)] text-text-muted">
          <span aria-hidden>💡</span>
          <span>Thinking...</span>
        </div>
      )}

      {/* Markdown body (think blocks stripped) */}
      <div className="typography-prose max-w-none pl-11">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{visibleContent || "\u00A0"}</ReactMarkdown>
      </div>

      {/* Actions + model badge */}
      <div className="flex items-center gap-4 pl-11">
        <MessageActions content={visibleContent} />
        {model && (
          <div className="ml-auto flex items-center gap-2 rounded-full bg-surface-overlay/50 border border-border px-3 py-1 animate-in fade-in slide-in-from-right-2 duration-1000">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim/80">
              {model.split("/").pop()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  lastMessageRef,
  routingMetadata,
}: ChatMessagesProps) {
  if (messages.length === 0) return null;

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 pb-60">
      {messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
        const showThinking =
          isLast &&
          isLoading &&
          m.role === "assistant" &&
          hasUnclosedThink(m.content);
        return (
          <div
            key={m.id}
            ref={isLast ? lastMessageRef : undefined}
            className={cn(
              "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-700",
              m.role === "user" ? "justify-end" : "justify-start flex-col",
            )}
          >
            {m.role === "user" ? (
              <UserMessage content={m.content} />
            ) : (
              <AssistantMessage
                content={m.content}
                model={m.model}
                showThinkingIndicator={showThinking}
              />
            )}
          </div>
        );
      })}

      {lastIsAssistant && routingMetadata && (
        <div
          className="flex flex-wrap items-center gap-2 pl-11 text-[var(--text-xs)] text-text-muted"
          data-routing-badge
        >
          <span>
            <strong className="text-text-dim/90">Routed to:</strong>{" "}
            {routingMetadata.model.split("/").pop() ?? routingMetadata.model}
          </span>
          <span className="text-border">·</span>
          <span>
            <strong className="text-text-dim/90">Reason:</strong>{" "}
            {routingMetadata.reason}
          </span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 pl-11 text-[var(--text-sm)] text-text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
}
