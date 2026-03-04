/**
 * Central model config for Nexora. Never hardcode model strings in agents or UI.
 * @see docs/AGENTS.md — Model routing: gpt-4o-mini for routing; claude-3.5-sonnet / o1 for reasoning.
 */

export const MODELS = {
  /** Cost-effective: routing, summaries, simple tasks */
  ROUTER: "openai/gpt-4o-mini",
  /** Reasoning, complex answers, research */
  REASONING: "anthropic/claude-3.5-sonnet",
  /** Alternative reasoning / chain-of-thought */
  REASONING_ALT: "openai/o1",
  /** Default for chat and general use */
  DEFAULT: "openai/gpt-4o",
  /** Claude for long context / analysis */
  CLAUDE_SONNET: "anthropic/claude-3.5-sonnet",
  CLAUDE_OPUS: "anthropic/claude-3-opus",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS] | string;

/** List of model ids for the model selector (10+ models) */
export const MODEL_OPTIONS: { id: string; label: string }[] = [
  { id: MODELS.DEFAULT, label: "GPT-4o" },
  { id: MODELS.CLAUDE_SONNET, label: "Claude 3.5 Sonnet" },
  { id: MODELS.CLAUDE_OPUS, label: "Claude 3 Opus" },
  { id: MODELS.ROUTER, label: "GPT-4o Mini" },
  { id: MODELS.REASONING_ALT, label: "o1" },
  { id: "google/gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat" },
];
