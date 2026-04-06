/**
 * Core domain types for the Nexora application.
 *
 * All shared types live here to provide a single source of truth
 * and prevent circular imports between components/lib modules.
 */

// ─── Chat ──────────────────────────────────────────────────────────────────

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

/** A single message in a chat conversation. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The model ID that produced this response (assistant messages only). */
  model?: string;
  attachments?: ChatAttachmentRef[];
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
