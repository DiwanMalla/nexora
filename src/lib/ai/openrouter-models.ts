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
    id: "moonshotai/kimi-k2.5",
    label: "Kimi K2.5",
    tier: "budget",
    notes: "Cheap general-purpose model for early routing and QA.",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek Chat V3",
    tier: "budget",
    notes: "Cost-efficient model for coding and broad reasoning.",
  },
  {
    id: "qwen/qwen3-4b:free",
    label: "Qwen3 4B (Free)",
    tier: "budget",
    notes: "Free fallback model for low-cost production testing.",
  },
  {
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    tier: "balanced",
    notes: "Fast, strong default for mixed workloads.",
  },
];

export const OPENROUTER_OMNI_MODEL_MAP: Record<OpenRouterRouteKey, string> = {
  coding: "deepseek/deepseek-chat-v3-0324",
  heavyReasoning: "moonshotai/kimi-k2.5",
  complexWriting: "moonshotai/kimi-k2.5",
  simple: "deepseek/deepseek-chat-v3-0324",
};

