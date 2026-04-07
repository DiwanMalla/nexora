/**
 * ChatMessages — Renders the conversation thread.
 *
 * Displays user and assistant messages with markdown support,
 * action buttons, and a simple loading indicator.
 */

"use client";

import { useState } from "react";
import { Hexagon, Paperclip, FileSearch, Eye } from "lucide-react";
import { cn, stripThinkBlocks } from "@/lib/utils";
import { normalizeMarkdownForRender } from "@/lib/markdown/normalize-markdown";
import type {
  AttachmentNote,
  ChatAssistantMeta,
  ChatAttachmentRef,
  ChatMessage,
  LiveNewsStructuredHeadline,
  LiveNewsStreamProgressStage,
} from "@/types";
import { MessageActions } from "./MessageActions";
import { remarkOmniReportSections } from "@/lib/markdown/remark-omni-report-sections";
import { useAiChatQualityPanel } from "@/lib/chat/markdown-panel-heuristic";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { useEffect } from "react";

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

function normalizeAssistantMarkdownForDisplay(input: string): string {
  return normalizeMarkdownForRender(input);
}

function humanVerificationLabel(h: LiveNewsStructuredHeadline): string {
  if (h.confidenceLabel?.trim()) return h.confidenceLabel.trim();
  switch (h.verificationLevel) {
    case "multi_source":
      return "Multi-source";
    case "single_source":
      return "Single-source";
    case "conflicting":
      return "Conflicting reports";
    case "limited_coverage":
      return "Limited coverage";
    case "developing":
      return "Developing";
    default:
      return "Reported";
  }
}

function extractLiveNewsHeaderMeta(markdown: string): {
  title?: string;
  asOf?: string;
  domainCount?: number;
} {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const titleLine = lines.find((l) => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : undefined;
  const freshnessLine = lines.find((l) => /as of/i.test(l) && /drawn from/i.test(l));
  const asOf = freshnessLine
    ? freshnessLine
        .replace(/\*\*/g, "")
        .replace(/^As of\s*/i, "")
        .split(/·/)[0]
        ?.trim()
    : undefined;
  const m = freshnessLine?.match(/drawn from\s+(\d+)\s+distinct news domains/i);
  const domainCount = m?.[1] ? Number.parseInt(m[1], 10) : undefined;
  return { title, asOf, domainCount };
}

const LIVE_NEWS_PROGRESS_LABELS = [
  "Searching trusted sources",
  "Checking latest headlines",
  "Verifying across sources",
  "Summarizing confirmed updates",
] as const;

const STREAM_STAGE_ORDER: LiveNewsStreamProgressStage[] = [
  "searching",
  "fetching",
  "clustering",
  "summarizing",
];

const STREAM_STAGE_LABELS: Record<LiveNewsStreamProgressStage, string> = {
  searching: "Searching the web",
  fetching: "Fetching live pages",
  clustering: "Grouping distinct stories",
  summarizing: "Writing verified summary",
};

function liveNewsStreamProgressSteps(
  stage: LiveNewsStreamProgressStage | null,
): Array<{ label: string; done: boolean }> {
  if (!stage) {
    return STREAM_STAGE_ORDER.map((k) => ({
      label: STREAM_STAGE_LABELS[k],
      done: false,
    }));
  }
  const idx = STREAM_STAGE_ORDER.indexOf(stage);
  const activeIndex = idx < 0 ? 0 : idx;
  return STREAM_STAGE_ORDER.map((k, i) => ({
    label: STREAM_STAGE_LABELS[k],
    done: i < activeIndex,
  }));
}

function LiveNewsResearchSummary({ meta }: { meta: ChatAssistantMeta }) {
  const [open, setOpen] = useState(false);
  const n = meta.webSearchCalls ?? 0;
  const isGroundedWithSearch =
    meta.responseStyleIntent === "live_news" &&
    meta.liveNewsGrounded === true &&
    meta.liveNewsSearchCompleted === true &&
    n > 0;
  if (!isGroundedWithSearch) return null;

  const queries = meta.webSearchQueries ?? [];
  const prefetchCount = meta.liveNewsPrefetchQueries?.length ?? 0;
  const searchAttempted = Boolean(meta.liveNewsSearchAttempted);
  const searchCompleted = Boolean(meta.liveNewsSearchCompleted);
  const structuredCount = meta.liveNewsStructured?.headlines.length ?? 0;
  const completedSteps: string[] = [];
  if (n > 0 || prefetchCount > 0) completedSteps.push("Searched trusted web sources");
  if (n > 0) completedSteps.push("Opened live pages from results");
  if (n >= 2 || prefetchCount >= 2) completedSteps.push("Compared overlapping reports");
  if (structuredCount > 0) {
    completedSteps.push("Summarized the most consistently reported updates");
  }
  if (n >= 2 || structuredCount > 0) {
    completedSteps.push("Checked multiple current sources before summarizing");
  }
  const showFailure = searchAttempted && !searchCompleted;
  const failureLabel =
    meta.liveNewsFailureReason === "model_not_supported"
      ? "Live search unavailable for this model"
      : "Live search didn't complete";

  const headlineCount = meta.liveNewsStructured?.headlines.length ?? 0;
  const domainsChecked = Math.max(
    headlineCount,
    prefetchCount,
    queries.length,
    n,
  );

  return (
    <div className="ml-11 mb-1 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-dim">
        <span className="font-semibold text-text">Live research</span>
        <span>·</span>
        <span className="text-violet-300">{meta.liveNewsGrounded ? "Grounded" : "Not grounded"}</span>
        <span>·</span>
        <span>{n} search{n === 1 ? "" : "es"}</span>
        <span>·</span>
        <span>{domainsChecked} domains checked</span>
        {queries.length > 0 || prefetchCount > 0 || headlineCount > 0 ? (
          <>
            <span>·</span>
            <button
              type="button"
              className="font-semibold text-text hover:text-violet-300"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? "Hide details" : "View details"}
            </button>
          </>
        ) : null}
      </div>
      {showFailure ? (
        <div className="mt-1 text-[10px] text-amber-300">
          {failureLabel}. No verified live-search evidence was returned in this turn.
        </div>
      ) : null}
      {open ? (
        <div className="mt-2 border-l border-border/60 pl-3 text-[10px] text-text-muted">
          {completedSteps.length > 0 ? (
            <ul className="space-y-1">
              {completedSteps.map((label) => (
                <li key={label} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div>No completed live-research steps were recorded for this turn.</div>
          )}
          {queries.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {queries.map((q) => (
                <li key={q} className="list-inside list-disc">
                  {q}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LiveNewsBriefCards({
  meta,
  visibleContent,
}: {
  meta: ChatAssistantMeta;
  visibleContent: string;
}) {
  const structured = meta.liveNewsStructured;
  if (
    !structured ||
    !meta.liveNewsGrounded ||
    !meta.liveNewsSearchCompleted ||
    (meta.webSearchCalls ?? 0) <= 0 ||
    structured.headlines.length === 0
  ) {
    return null;
  }

  const { title, asOf, domainCount } = extractLiveNewsHeaderMeta(visibleContent);

  return (
    <section className="ml-11 rounded-2xl bg-bg-card/55 px-5 py-4">
      <div className="mb-4">
        <div className="text-[var(--text-base)] font-semibold tracking-tight text-text">
          {title || "Live global briefing"}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-text-dim/90">
          {asOf ? <span>As of {asOf}</span> : null}
          {typeof domainCount === "number" ? (
            <span>{domainCount} distinct domains</span>
          ) : null}
          {typeof structured.dominantDomainShare === "number" ? (
            <span>
              {Math.round(structured.dominantDomainShare * 100)}% max single-domain share
            </span>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {structured.headlines.map((h, i) => (
          <article key={`${h.topicLabel}-${i}`} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                {h.topicLabel}
              </span>
            </div>

            <p className="text-[var(--text-sm)] font-medium leading-relaxed text-text">
              {h.claim}
            </p>

            {h.whyItMatters ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
                <span className="font-semibold text-text-dim">Why it matters:</span>{" "}
                {h.whyItMatters}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {h.citations.length > 0
                ? h.citations.slice(0, 6).map((c, idx) => (
                  <a
                    key={`${c.url}-${idx}`}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-surface-overlay/65 px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:text-text"
                    title={c.title}
                  >
                    {c.domain || c.title || "Source"}
                  </a>
                ))
                : null}
              <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.11em] text-text-dim">
                {humanVerificationLabel(h)}
                {typeof h.independentDomainCount === "number"
                  ? ` · ${h.independentDomainCount} domains`
                  : ""}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingHint?: string;
  progressSteps?: Array<{ label: string; done: boolean }>;
  activeStepLabel?: string;
  /** While waiting on /api/chat for a broad live-news prompt — compact pipeline steps. */
  liveNewsProgressLoading?: boolean;
  /** Server-reported stage when using NDJSON stream (live news). */
  liveNewsStreamStage?: LiveNewsStreamProgressStage | null;
  agentId?: string;
  /** Ref attached to the last message so parent can scroll it into view. */
  lastMessageRef?: React.RefObject<HTMLDivElement | null>;
  replyImages?: ReplyImage[];
  replyImageQuery?: string | null;
  replyImageState?: ReplyImageState;
  replyImageError?: string | null;
  onOpenAttachmentNote?: (note: AttachmentNote) => void;
}

/** Renders a single user message bubble. */
function UserMessage({
  content,
  attachments,
}: {
  content: string;
  attachments?: ChatAttachmentRef[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="max-w-[80%] rounded-2xl bg-bg-card border border-border px-4 py-3 text-[var(--text-md)] leading-[var(--leading-relaxed)] text-text">
        {attachments && attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-overlay px-2.5 py-1 text-[11px] font-semibold text-text-muted"
              >
                <Paperclip className="h-3 w-3 shrink-0 opacity-80" />
                <span className="max-w-[200px] truncate">{a.originalName}</span>
              </span>
            ))}
          </div>
        ) : null}
        {content}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-invert text-surface-invert-text text-[var(--text-xs)] font-semibold shadow-sm">
        DM
      </div>
    </div>
  );
}

function AttachmentToolCard({
  showProgress,
  note,
  onOpenAttachmentNote,
}: {
  showProgress: boolean;
  note?: AttachmentNote;
  onOpenAttachmentNote?: (note: AttachmentNote) => void;
}) {
  const progressRows = [
    "Using Tool | ReadAttachment",
    "Using Tool | ExtractTitle",
    "Using Tool | ParseSections",
    "Using Tool | WriteNotes",
  ];
  const doneRows = [
    "Using Tool | ReadAttachment",
    "Using Tool | ExtractTitle",
    "Using Tool | ParseSections",
    "Using Tool | WriteNotes",
  ];

  return (
    <div className="ml-11 rounded-lg border border-border/80 bg-surface-overlay/50 px-3 py-2 text-[11px]">
      <div className="mb-2 flex items-center gap-1.5 font-semibold text-text">
        <FileSearch className="h-3.5 w-3.5" />
        Attachment Reader
      </div>
      {showProgress ? (
        <div className="space-y-1 text-text-muted">
          {progressRows.map((row) => (
            <div key={row} className="flex items-center justify-between gap-2">
              <span>{row}</span>
              <span className="text-[10px] uppercase tracking-wide text-text-dim">
                Running
              </span>
            </div>
          ))}
          <div className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
            Exit Code: pending
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-text-muted">
          {doneRows.map((row) => (
            <div key={row} className="flex items-center justify-between gap-2">
              <span>{row}</span>
              {note ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border bg-bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text"
                  onClick={() => onOpenAttachmentNote?.(note)}
                >
                  <Eye className="h-3 w-3" />
                  View
                </button>
              ) : (
                <span className="text-[10px] uppercase tracking-wide text-text-dim">
                  Done
                </span>
              )}
            </div>
          ))}
          <div className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
            Exit Code: 0
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a single assistant message with markdown and actions. */
function AssistantMessage({
  content,
  model,
  topContent,
  assistantMeta,
  showTypingIndicator = false,
  hideActions = false,
  reportMode = false,
  qualityPanel = false,
}: {
  content: string;
  model?: string;
  topContent?: React.ReactNode;
  assistantMeta?: ChatAssistantMeta;
  showTypingIndicator?: boolean;
  hideActions?: boolean;
  reportMode?: boolean;
  /** Subtle bordered panel for structured / long AI Chat replies (Omni-like readability). */
  qualityPanel?: boolean;
}) {
  const visibleContent = normalizeAssistantMarkdownForDisplay(
    stripThinkBlocks(content),
  );
  const hasVisibleContent = Boolean(visibleContent.trim());
  const showLiveNewsCards =
    Boolean(assistantMeta?.liveNewsStructured?.headlines?.length) &&
    assistantMeta?.responseStyleIntent === "live_news" &&
    assistantMeta?.liveNewsGrounded === true &&
    assistantMeta?.liveNewsSearchCompleted === true &&
    (assistantMeta?.webSearchCalls ?? 0) > 0;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!/\|/.test(content) && !/\|/.test(visibleContent)) return;
    console.debug("[Nexora chat] assistant pre-render markdown debug", {
      rawLength: content.length,
      rawNewlineCount: (content.match(/\n/g) ?? []).length,
      rawEscapedNewlineCount: (content.match(/\\n/g) ?? []).length,
      normalizedLength: visibleContent.length,
      normalizedNewlineCount: (visibleContent.match(/\n/g) ?? []).length,
      normalizedEscapedNewlineCount: (visibleContent.match(/\\n/g) ?? []).length,
      rawJsonPreview: JSON.stringify(content).slice(0, 1200),
      normalizedJsonPreview: JSON.stringify(visibleContent).slice(0, 1200),
    });
  }, [content, visibleContent]);

  const containerBaseClass = reportMode
    ? "typography-prose omni-report-panel ml-11 max-w-none"
    : qualityPanel
      ? "typography-prose ai-chat-answer-panel max-w-none pl-11"
      : "typography-prose max-w-none pl-11";

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

      {assistantMeta ? <LiveNewsResearchSummary meta={assistantMeta} /> : null}

      {topContent}

      {assistantMeta && showLiveNewsCards ? (
        <LiveNewsBriefCards meta={assistantMeta} visibleContent={visibleContent} />
      ) : null}

      {/* Markdown body (think blocks stripped) */}
      {hasVisibleContent && !showLiveNewsCards && (
        <div className={containerBaseClass}>
          <MarkdownRenderer
            content={visibleContent}
            skipNormalize
            extraRemarkPlugins={reportMode ? [remarkOmniReportSections()] : undefined}
            components={
              reportMode
                ? ({
                    omniSection: OmniSection,
                  } as any)
                : undefined
            }
          />
        </div>
      )}

      {/* Actions + model badge */}
      {hasVisibleContent && !hideActions && (
        <div
          className={cn(
            "flex items-center gap-4",
            reportMode ? "ml-11 pl-0" : "pl-11",
          )}
        >
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

function OmniSection({
  node,
  children,
}: {
  // `node` is a custom AST node emitted by `remarkOmniReportSections`.
  node: any;
  children: React.ReactNode;
}) {
  const kind = node?.kind as
    | "verified"
    | "documented"
    | "uncertain"
    | "priorities";
  const title = typeof node?.title === "string" ? node.title : "";

  return (
    <section
      className={cn(
        "omni-report-section",
        kind ? `omni-report-section--${kind}` : undefined,
      )}
    >
      {title ? <h2 className="omni-report-section-title">{title}</h2> : null}
      <div className="omni-report-section-body">{children}</div>
    </section>
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

function TypingIndicator({
  hint,
  steps = [],
  activeLabel,
}: {
  hint?: string;
  steps?: Array<{ label: string; done: boolean }>;
  activeLabel?: string;
}) {
  return (
    <div className="ml-11 flex flex-col gap-2 text-[var(--text-sm)] text-text-muted">
      <div className="flex items-center gap-3">
        <span>{hint || "Nexora is thinking"}</span>
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:180ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:360ms]" />
        </span>
      </div>
      {steps.length > 0 && (
        <div className="flex flex-col gap-1 text-[var(--text-xs)]">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <span aria-hidden>{step.done ? "✓" : "…"}</span>
              <span className={step.done ? "text-text-muted" : "text-text-dim"}>
                {step.label}
              </span>
            </div>
          ))}
          {activeLabel && !steps.some((s) => s.label === activeLabel) && (
            <div className="flex items-center gap-2">
              <span aria-hidden>…</span>
              <span className="text-text-dim">{activeLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantTypingMessage({
  hint,
  steps,
  activeLabel,
}: {
  hint?: string;
  steps?: Array<{ label: string; done: boolean }>;
  activeLabel?: string;
}) {
  return (
    <div className="flex w-full justify-start flex-col animate-in fade-in slide-in-from-bottom-2 duration-700">
      <AssistantMessage
        content=""
        showTypingIndicator={false}
        topContent={
          <TypingIndicator
            hint={hint}
            steps={steps}
            activeLabel={activeLabel}
          />
        }
      />
    </div>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  loadingHint,
  progressSteps = [],
  activeStepLabel,
  liveNewsProgressLoading = false,
  liveNewsStreamStage = null,
  lastMessageRef,
  replyImages = [],
  replyImageQuery = null,
  replyImageState = "idle",
  replyImageError = null,
  agentId,
  onOpenAttachmentNote,
}: ChatMessagesProps) {
  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];
  const lastAssistantContent =
    lastMessage?.role === "assistant"
      ? stripThinkBlocks(lastMessage.content).trim()
      : "";
  const shouldShowTypingIndicator =
    isLoading && (lastMessage?.role !== "assistant" || !lastAssistantContent);

  const mergedProgressSteps: Array<{ label: string; done: boolean }> =
    liveNewsProgressLoading && liveNewsStreamStage !== null
      ? liveNewsStreamProgressSteps(liveNewsStreamStage)
      : liveNewsProgressLoading
        ? LIVE_NEWS_PROGRESS_LABELS.map((label) => ({ label, done: false }))
        : progressSteps;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 pb-60">
      {messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
        const reportMode =
          agentId === "omni" &&
          /(^|\n)##\s+(✅\s*Verified in retrieved artifacts|🛠️\s*Documented|⚠️\s*Uncertain|Top 3 beta-readiness priorities|##\s*Summary)/m.test(
            m.content,
          );
        const qualityPanel =
          !reportMode && useAiChatQualityPanel(agentId, m.content);
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
              <UserMessage
                content={m.content}
                attachments={m.attachments}
              />
            ) : (
              <AssistantMessage
                content={m.content}
                model={m.model}
                assistantMeta={m.assistantMeta}
                showTypingIndicator={false}
                hideActions={isLast && isLoading}
                reportMode={reportMode}
                qualityPanel={qualityPanel}
                topContent={
                  isLast ? (
                    <>
                      {idx > 0 && messages[idx - 1]?.role === "user" &&
                      messages[idx - 1]?.attachments?.length ? (
                        <AttachmentToolCard
                          showProgress={isLoading}
                          note={messages[idx - 1]?.attachments?.find((a) => a.note)?.note}
                          onOpenAttachmentNote={onOpenAttachmentNote}
                        />
                      ) : null}
                      {shouldShowTypingIndicator ? (
                        <TypingIndicator
                          hint={loadingHint}
                          steps={mergedProgressSteps}
                          activeLabel={activeStepLabel}
                        />
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
        <div className="flex w-full justify-start flex-col animate-in fade-in slide-in-from-bottom-2 duration-700">
          {lastMessage?.attachments?.length ? (
            <AttachmentToolCard
              showProgress
              note={lastMessage.attachments.find((a) => a.note)?.note}
              onOpenAttachmentNote={onOpenAttachmentNote}
            />
          ) : null}
          <AssistantTypingMessage
            hint={loadingHint}
            steps={mergedProgressSteps}
            activeLabel={activeStepLabel}
          />
        </div>
      )}
    </div>
  );
}
