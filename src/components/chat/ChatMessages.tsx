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
import { cn, stripThinkBlocks } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { MessageActions } from "./MessageActions";

export interface RoutingMetadata {
  model: string;
  reason: string;
}

export interface ReplyImage {
  url: string;
  title: string;
  sourceUrl?: string;
}

export type ReplyImageState = "idle" | "loading" | "done" | "error";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingHint?: string;
  agentId?: string;
  /** Ref attached to the last message so parent can scroll it into view. */
  lastMessageRef?: React.RefObject<HTMLDivElement | null>;
  replyImages?: ReplyImage[];
  replyImageQuery?: string | null;
  replyImageState?: ReplyImageState;
  replyImageError?: string | null;
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
  topContent,
  showTypingIndicator = false,
  hideActions = false,
}: {
  content: string;
  model?: string;
  topContent?: React.ReactNode;
  showTypingIndicator?: boolean;
  hideActions?: boolean;
}) {
  const visibleContent = stripThinkBlocks(content);
  const hasVisibleContent = Boolean(visibleContent.trim());
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

      {showTypingIndicator && <TypingIndicator />}

      {topContent}

      {/* Markdown body (think blocks stripped) */}
      {hasVisibleContent && (
        <div className="typography-prose max-w-none pl-11">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {visibleContent}
          </ReactMarkdown>
        </div>
      )}

      {/* Actions + model badge */}
      {hasVisibleContent && !hideActions && (
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
      )}
    </div>
  );
}

function AssistantReplyImages({
  images,
  query,
  status,
  error,
}: {
  images: ReplyImage[];
  query: string | null;
  status: ReplyImageState;
  error: string | null;
}) {
  if (status === "idle" && images.length === 0) {
    return null;
  }

  return (
    <div className="ml-11 rounded-2xl border border-border bg-bg-card/80 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-[var(--text-sm)] font-semibold text-text">
          Images
        </div>
        {query ? (
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            {query}
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="ml-auto text-[var(--text-xs)] text-text-muted">
            Loading related images...
          </div>
        ) : null}
      </div>

      {status === "error" && error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[var(--text-xs)] text-red-300">
          {error}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <a
              key={`${image.url}-${index}`}
              href={image.sourceUrl ?? image.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-xl border border-border bg-surface-overlay/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-surface-overlay/50"
            >
              <div className="aspect-[16/10] overflow-hidden bg-surface-overlay/50">
                <img
                  src={image.url}
                  alt={image.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3">
                <div className="line-clamp-2 text-[var(--text-sm)] font-medium text-text">
                  {image.title}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-text-dim">
                  Open source
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TypingIndicator({ hint }: { hint?: string }) {
  return (
    <div className="ml-11 flex items-center gap-3 text-[var(--text-sm)] text-text-muted">
      <span>{hint || "Nexora is thinking"}</span>
      <span className="inline-flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:180ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:360ms]" />
      </span>
    </div>
  );
}

function AssistantTypingMessage({ hint }: { hint?: string }) {
  return (
    <div className="flex w-full justify-start flex-col animate-in fade-in slide-in-from-bottom-2 duration-700">
      <AssistantMessage
        content=""
        showTypingIndicator={false}
        topContent={<TypingIndicator hint={hint} />}
      />
    </div>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  loadingHint,
  lastMessageRef,
  replyImages = [],
  replyImageQuery = null,
  replyImageState = "idle",
  replyImageError = null,
}: ChatMessagesProps) {
  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];
  const lastAssistantContent =
    lastMessage?.role === "assistant"
      ? stripThinkBlocks(lastMessage.content).trim()
      : "";
  const shouldShowTypingIndicator =
    isLoading && (lastMessage?.role !== "assistant" || !lastAssistantContent);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 pb-60">
      {messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
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
                showTypingIndicator={false}
                hideActions={isLast && isLoading}
                topContent={
                  isLast ? (
                    <>
                      {shouldShowTypingIndicator ? (
                        <TypingIndicator hint={loadingHint} />
                      ) : null}
                    <AssistantReplyImages
                      images={replyImages}
                      query={replyImageQuery}
                      status={replyImageState}
                      error={replyImageError}
                    />
                    </>
                  ) : undefined
                }
              />
            )}
          </div>
        );
      })}

      {shouldShowTypingIndicator && lastMessage?.role !== "assistant" && (
        <AssistantTypingMessage hint={loadingHint} />
      )}
    </div>
  );
}
