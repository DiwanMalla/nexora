export type OpenRouterTier = "budget" | "balanced" | "premium";

export type OpenRouterModelEntry = {
  id: string;
  label: string;
  tier: OpenRouterTier;
  notes: string;
};

export type OpenRouterRouteKey =
  | "coding"
  | "heavyReasoning"
  | "complexWriting"
  | "simple";

export const OPENROUTER_MODELS: OpenRouterModelEntry[] = [
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini (Fast Default)",
    tier: "budget",
    notes: "Fast default model for quick answers and reasoning-only prompts.",
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    label: "Claude 3.7 Sonnet (Grounded Synthesis)",
    tier: "premium",
    notes: "Strong grounded synthesis, writing, repo & URL summaries, and technical explanations.",
  },
  {
    id: "openai/o3-mini-high",
    label: "o3-mini-high (Heavy Reasoning)",
    tier: "premium",
    notes: "Higher-quality multi-step reasoning when quality matters more than speed.",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek Chat V3 (Backup Reasoning)",
    tier: "budget",
    notes: "Backup reasoning model for degraded-mode retries / first-token timeout fallback.",
  },
];

export const OPENROUTER_FAST_FALLBACK_MODEL_ID = "openai/gpt-4o-mini";
export const OPENROUTER_BACKUP_REASONING_MODEL_ID =
  "deepseek/deepseek-chat-v3-0324";

export const OPENROUTER_OMNI_MODEL_MAP: Record<OpenRouterRouteKey, string> = {
  simple: "openai/gpt-4o-mini",
  complexWriting: "anthropic/claude-3.7-sonnet",
  coding: "anthropic/claude-3.7-sonnet",
  heavyReasoning: "openai/o3-mini-high",
};

