/**
 * OmniAgent router — selects the best Groq model based on prompt intent.
 * Uses keyword detection to route to: coding, heavy reasoning, complex writing, or fast default.
 */

export type RouteResult = {
  modelId: string;
  reason: string;
};

const CODING_KEYWORDS = [
  "code",
  "bug",
  "debug",
  "function",
  "javascript",
  "python",
  "sql",
  "api",
  "algorithm",
  "implement",
  "fix the code",
  "syntax",
  "refactor",
  "repository",
];

const HEAVY_REASONING_KEYWORDS = [
  "system design",
  "architecture",
  "ai agents",
  "distributed systems",
  "machine learning",
  "deep learning",
  "neural network",
  "scalability",
  "microservices",
];

const COMPLEX_WRITING_KEYWORDS = [
  "explain",
  "analysis",
  "analyze",
  "compare",
  "research",
  "essay",
  "strategy",
  "write article",
  "write a",
  "detailed",
  "comprehensive",
  "in-depth",
  "step by step",
  "how does",
  "why does",
];

/** Groq model IDs used by the router (must match Groq API). */
export const OMNI_MODELS = {
  coding: "qwen/qwen3-32b",
  heavyReasoning: "openai/gpt-oss-120b",
  complexWriting: "llama-3.3-70b-versatile",
  simple: "openai/gpt-oss-20b",
} as const;

/**
 * Analyzes the prompt and returns the best Groq model ID and a human-readable reason.
 * Priority: coding → heavy reasoning → complex writing → simple (fallback).
 */
export function routePrompt(message: string): RouteResult {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return {
      modelId: OMNI_MODELS.simple,
      reason: "Empty prompt routed to fast model",
    };
  }

  for (const keyword of CODING_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        modelId: OMNI_MODELS.coding,
        reason: "Coding task detected",
      };
    }
  }

  for (const keyword of HEAVY_REASONING_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        modelId: OMNI_MODELS.heavyReasoning,
        reason: "Heavy reasoning task",
      };
    }
  }

  for (const keyword of COMPLEX_WRITING_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        modelId: OMNI_MODELS.complexWriting,
        reason: "Complex reasoning or writing task",
      };
    }
  }

  return {
    modelId: OMNI_MODELS.simple,
    reason: "Simple prompt routed to fast model",
  };
}
