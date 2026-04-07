/**
 * Core domain types for the Nexora application.
 *
 * All shared types live here to provide a single source of truth
 * and prevent circular imports between components/lib modules.
 */

// ─── Chat ──────────────────────────────────────────────────────────────────

/** Parsed from model output for live-news turns (claim-level citations). */
export type LiveNewsCitation = {
  title: string;
  url: string;
  domain?: string;
  publishedAt?: string;
};

export type LiveNewsVerificationLevel =
  | "multi_source"
  | "single_source"
  | "conflicting"
  | "limited_coverage"
  | "developing";

export type LiveNewsStructuredHeadline = {
  topicLabel: string;
  claim: string;
  /** One sentence: stakes / who cares (global snapshot). */
  whyItMatters?: string;
  citations: LiveNewsCitation[];
  verificationLevel: LiveNewsVerificationLevel;
  confidenceLabel?: string;
  independentDomainCount?: number;
};

export type LiveNewsStructuredPayload = {
  headlines: LiveNewsStructuredHeadline[];
  dominantDomainShare?: number;
};

/** NDJSON stream progress for live-news requests (`stream: true`). */
export type LiveNewsStreamProgressStage =
  | "searching"
  | "fetching"
  | "clustering"
  | "summarizing";

/** File the user attached to a message (v1). */
export type AttachmentNote = {
  id: string;
  attachmentId: string;
  fileName: string;
  fileType: string;
  title?: string;
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  extractedTextPreview?: string;
  uncertainties?: string[];
  createdAt: string;
};

/** File the user attached to a message (v1). */
export type ChatAttachmentRef = {
  id: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  note?: AttachmentNote;
};

/** Debug / UX metadata returned with chat completions (also logged server-side). */
export type ChatResponseMeta = {
  mode: "single" | "consensus";
  provider?: string;
  modelId?: string;
  displayName?: string;
  consensusModelIds?: string[];
  synthesisModelId?: string;
  webSearchEnabled?: boolean;
  webSearchCalls?: number;
  webSearchQueries?: string[];
  stepCount?: number;
  /** Server detected time-sensitive / current-fact question */
  currentFactIntent?: boolean;
  currentFactReason?: string;
  /** Tavily preflight ran before the LLM (search-first path) */
  preflightTavily?: boolean;
  preflightSubstantive?: boolean;
  preflightError?: string;
  /** True when current-fact path replaced the model text (no webSearch executed). */
  currentFactGuardTriggered?: boolean;
  /** Model/tool loop threw; response text is a safe fallback (HTTP may still be 200). */
  chatGenerationDegraded?: boolean;
  /** Server-classified task shape for adaptive response guidance (AI Chat single-model). */
  responseStyleIntent?:
    | "current_fact"
    | "leader_since_office"
    | "live_news"
    | "repo_inspection"
    | "teaching"
    | "writing"
    | "coding"
    | "comparison"
    | "general_chat";
  /** Live-news grounded mode: structured briefing + forced web retrieval. */
  liveNewsGrounded?: boolean;
  /** True when live-news retrieval was attempted in this turn. */
  liveNewsSearchAttempted?: boolean;
  /** True when at least one real live-news search path completed. */
  liveNewsSearchCompleted?: boolean;
  /** Why live-news retrieval did not complete (when applicable). */
  liveNewsFailureReason?:
    | "search_not_completed"
    | "tool_loop_failed"
    | "model_not_supported";
  /** Claim-level citations when the model emitted valid `nexora-live-news-json`. */
  liveNewsStructured?: LiveNewsStructuredPayload;
  /** Queries used in server-side live-news prefetch (before the model tool loop). */
  liveNewsPrefetchQueries?: string[];
};

/** Subset of chat response meta stored on assistant bubbles for UI (e.g. research summary). */
export type ChatAssistantMeta = Pick<
  ChatResponseMeta,
  | "responseStyleIntent"
  | "webSearchCalls"
  | "webSearchQueries"
  | "liveNewsGrounded"
  | "liveNewsSearchAttempted"
  | "liveNewsSearchCompleted"
  | "liveNewsFailureReason"
  | "liveNewsStructured"
  | "liveNewsPrefetchQueries"
>;

/** A single message in a chat conversation. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The model ID that produced this response (assistant messages only). */
  model?: string;
  attachments?: ChatAttachmentRef[];
  /** Last /api/chat meta slice for transparency UI (assistant only). */
  assistantMeta?: ChatAssistantMeta;
};

/** Shape of a successful response from the `/api/chat` endpoint. */
export type ChatAPIResponse = {
  text?: string;
  model?: string;
  error?: string;
  details?: string;
  meta?: ChatResponseMeta;
};

/** Body payload sent to the `/api/chat` endpoint. */
export type ChatAPIRequest = {
  model: string;
  messages: { role: string; content: string }[];
  enabledModels?: string[];
  /** When true (default), single-model chat runs a Tavily-backed webSearch tool loop. */
  webSearch?: boolean;
  /** Stable client-generated thread id (UUID in URL). */
  conversationId?: string;
  /** Agent context in single-model chat (aichat/researcher/coder/analyst). */
  agentType?: string;
  /** Ready attachment row ids (v1: at most one). Server injects extracted text as context. */
  attachmentIds?: string[];
  /**
   * When true with live-news intent, response is NDJSON: progress lines then `done`.
   * See `sendChatMessageStream` in `@/lib/api`.
   */
  stream?: boolean;
};

// ─── AI Models & Agents ─────────────────────────────────────────────────────

/** A selectable AI model available for chat. */
export type AIModel = {
  id: string;
  name: string;
  provider: string;
};

/** An AI agent type (Omni, Researcher, Coder, etc.). */
export type AIAgent = {
  id: string;
  name: string;
  /** Lucide icon name */
  icon: string;
};

/** Human-readable labels for each agent type. */
export const AGENT_TYPE_LABELS: Record<string, string> = {
  omni: "Omni Agent",
  aichat: "AI Chat",
  researcher: "Researcher",
  coder: "Developer",
  analyst: "Analyst",
} as const;

// ─── Multi-Chat ──────────────────────────────────────────────────────────────

/** A single round of multi-model chat: user prompt + each model's response. */
export type MultiChatRound = {
  user: string;
  responses: MultiChatResponse[];
};

/** An individual model's response within a multi-chat round. */
export type MultiChatResponse = {
  model: AIModel;
  content: string;
  loading?: boolean;
};
