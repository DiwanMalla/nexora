/**
 * Core domain types for the Nexora application.
 *
 * All shared types live here to provide a single source of truth
 * and prevent circular imports between components/lib modules.
 */

// ─── Chat ──────────────────────────────────────────────────────────────────

/** A single message in a chat conversation. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The model ID that produced this response (assistant messages only). */
  model?: string;
};

/** Shape of a successful response from the `/api/chat` endpoint. */
export type ChatAPIResponse = {
  text?: string;
  model?: string;
  error?: string;
  details?: string;
};

/** Body payload sent to the `/api/chat` endpoint. */
export type ChatAPIRequest = {
  model: string;
  messages: { role: string; content: string }[];
  enabledModels?: string[];
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
