/**
 * AI Providers & Models – grouped by provider for UI (e.g. model selection dropdowns).
 * Each model can optionally list capabilities: reasoning, coding, vision, speech, tts, etc.
 */

export type AIModelEntry = {
  name: string;
  /** Model id for API calls (e.g. Groq, OpenRouter). Set when integrated. */
  apiId?: string;
  /** Short description of strength / key advantage */
  keyAdvantage: string;
  /** Optional capabilities e.g. ["reasoning", "coding", "vision", "speech", "tts"] */
  capability?: string[];
};

export type AIProviderGroup = {
  name: string;
  models: AIModelEntry[];
};

export type AIProvider = {
  id: string;
  name: string;
  /** Link to provider logo or single character/emoji */
  logo?: string;
  /** Tailwind color classes for the provider logo (e.g. bg-blue-500/20 text-blue-400) */
  accent?: string;
  /** Short summary of what this provider offers */
  description?: string;
  /** Whether this provider is shown by default in the UI */
  isDefault?: boolean;
  /** Flat list of models (when no groups). */
  models?: AIModelEntry[];
  /** When set, models are grouped (e.g. Groq: OpenAI, Llama, Qwen…). Use for dropdown columns. */
  groups?: AIProviderGroup[];
};

// ─── OpenAI ────────────────────────────────────────────────────────────────
const openai: AIProvider = {
  id: "openai",
  name: "OpenAI",
  logo: "O",
  accent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  description: "Industry-leading reasoning and multi-modal intelligence.",
  isDefault: true,
  models: [
    {
      name: "GPT-5.4 (High)",
      keyAdvantage: "The gold standard for multi-step logic and reliable tool-calling.",
      capability: ["reasoning"],
    },
    {
      name: "GPT-5.3 Codex",
      keyAdvantage: "Specialized for full-stack projects; lowest error rate in code generation.",
      capability: ["coding"],
    },
    {
      name: "GPT-4.1 Mini",
      keyAdvantage: "Reliable, fast, and optimized for categorization and routing.",
      capability: ["speed"],
    },
  ],
};

// ─── Anthropic ────────────────────────────────────────────────────────────
const anthropic: AIProvider = {
  id: "anthropic",
  name: "Anthropic",
  logo: "A",
  accent: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  description: "Human-centric safe AI with excellent writing and coding skills.",
  isDefault: true,
  models: [
    {
      name: "Claude 4.6 Opus",
      keyAdvantage: "Ranked #1 for \"human-like\" reasoning and complex task planning.",
      capability: ["reasoning"],
    },
    {
      name: "Claude 4.6 Sonnet",
      keyAdvantage: "Favorite for \"one-shot\" coding; excellent at refactoring large files.",
      capability: ["coding"],
    },
  ],
};

// ─── Google ───────────────────────────────────────────────────────────────
const google: AIProvider = {
  id: "google",
  name: "Google",
  logo: "G",
  accent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  description: "Massive context windows and deeply integrated search capabilities.",
  isDefault: true,
  models: [
    {
      name: "Gemini 3.1 Pro",
      keyAdvantage: "Matches the top models in logic; 1M+ token context. Strong for repository-level coding.",
      capability: ["reasoning", "coding"],
    },
    {
      name: "Gemini 3.1 Flash-Lite",
      keyAdvantage: "Extremely low latency and very high throughput for simple tasks.",
      capability: ["speed"],
    },
  ],
};

// ─── Meta ─────────────────────────────────────────────────────────────────
const meta: AIProvider = {
  id: "meta",
  name: "Meta",
  logo: "M",
  accent: "bg-blue-600/20 text-blue-500 border-blue-600/30",
  description: "The world's leading open-weight models for fast inference.",
  isDefault: true,
  models: [
    {
      name: "Llama 4 Scout",
      keyAdvantage: "Incredible 10M token context window (the largest currently available).",
      capability: ["reasoning", "vision", "multilingual"],
    },
  ],
};

// ─── DeepSeek ──────────────────────────────────────────────────────────────
const deepseek: AIProvider = {
  id: "deepseek",
  name: "DeepSeek",
  models: [
    {
      name: "DeepSeek-V3.2",
      keyAdvantage: "Best \"Value-to-Performance\" ratio for coding; matches GPT-4o for pennies.",
      capability: ["coding"],
    },
  ],
};

// ─── Alibaba ──────────────────────────────────────────────────────────────
const alibaba: AIProvider = {
  id: "alibaba",
  name: "Alibaba",
  models: [
    {
      name: "Qwen 3.5",
      keyAdvantage: "The leader in multilingual performance and mathematical reasoning.",
      capability: ["reasoning", "multilingual"],
    },
  ],
};

// ─── xAI ───────────────────────────────────────────────────────────────────
const xai: AIProvider = {
  id: "xai",
  name: "xAI",
  models: [
    {
      name: "Grok-4.20",
      keyAdvantage: "Features a unique \"Parallel Agent\" architecture for high-speed reasoning.",
      capability: ["reasoning"],
    },
  ],
};

// ─── Mistral AI ───────────────────────────────────────────────────────────
const mistral: AIProvider = {
  id: "mistral",
  name: "Mistral AI",
  models: [
    {
      name: "Mistral Large 3",
      keyAdvantage: "Europe's premier model, known for efficiency and strong function-calling.",
      capability: ["reasoning", "coding"],
    },
  ],
};

// ─── Z.ai ─────────────────────────────────────────────────────────────────
const zai: AIProvider = {
  id: "zai",
  name: "Z.ai",
  models: [
    {
      name: "GLM-5",
      keyAdvantage: "An MIT-licensed reasoning model that rivals proprietary giants in logic tests.",
      capability: ["reasoning"],
    },
  ],
};

// ─── Inception ─────────────────────────────────────────────────────────────
const inception: AIProvider = {
  id: "inception",
  name: "Inception",
  models: [
    {
      name: "Mercury 2",
      keyAdvantage: "Currently the fastest in the world at 727 tokens/second.",
      capability: ["speed"],
    },
  ],
};

// ─── Xiaomi ───────────────────────────────────────────────────────────────
const xiaomi: AIProvider = {
  id: "xiaomi",
  name: "Xiaomi",
  models: [
    {
      name: "MiMo-V2-Flash",
      keyAdvantage: "A disruptor model specifically tuned for fast agentic loops and terminal use.",
      capability: ["speed"],
    },
  ],
};

// ─── Groq (hosted models, grouped by family) ─────────────────────────────────
const groq: AIProvider = {
  id: "groq",
  name: "Groq",
  logo: "G",
  accent: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  description: "The fastest inference engine for Llama, Qwen and Mistral.",
  isDefault: true,
  groups: [
    {
      name: "OpenAI",
      models: [
        { name: "GPT OSS 120B", apiId: "openai/gpt-oss-120b", keyAdvantage: "Large-scale reasoning, tool use, text, multilingual.", capability: ["reasoning", "function-calling", "text", "multilingual"] },
        { name: "GPT OSS 20B", apiId: "openai/gpt-oss-20b", keyAdvantage: "Efficient reasoning, tool-calling, multilingual.", capability: ["reasoning", "function-calling", "text", "multilingual"] },
        { name: "Safety GPT OSS 20B", apiId: "openai/gpt-oss-safeguard-20b", keyAdvantage: "Content moderation and safety.", capability: ["safety"] },
      ],
    },
    {
      name: "Llama",
      models: [
        { name: "Llama 4 Scout", apiId: "meta-llama/llama-4-scout-17b-16e-instruct", keyAdvantage: "Large context, vision, tool support.", capability: ["function-calling", "text", "vision", "multilingual"] },
        { name: "Llama 3.3 70B", apiId: "llama-3.3-70b-versatile", keyAdvantage: "Versatile, fast chat.", capability: ["text", "multilingual"] },
      ],
    },
    {
      name: "Qwen",
      models: [
        { name: "Qwen 3 32B", apiId: "qwen/qwen3-32b", keyAdvantage: "Strong reasoning and function-calling.", capability: ["reasoning", "function-calling"] },
      ],
    },
    {
      name: "Kimi",
      models: [
        { name: "Kimi K2", apiId: "moonshotai/kimi-k2-instruct-0905", keyAdvantage: "Long context, tool use, multilingual.", capability: ["function-calling", "text", "multilingual"] },
      ],
    },
    {
      name: "Orpheus",
      models: [
        { name: "Orpheus English", apiId: "canopylabs/orpheus-v1-english", keyAdvantage: "English TTS.", capability: ["tts"] },
        { name: "Orpheus Arabic Saudi", apiId: "canopylabs/orpheus-arabic-saudi", keyAdvantage: "Arabic (Saudi) TTS.", capability: ["tts"] },
      ],
    },
    {
      name: "Whisper",
      models: [
        { name: "Whisper Large v3", keyAdvantage: "Accurate multilingual transcription.", capability: ["speech", "multilingual"] },
        { name: "Whisper Large v3 Turbo", keyAdvantage: "Faster real-time STT.", capability: ["speech"] },
      ],
    },
    {
      name: "ElevenLabs",
      models: [
        { name: "ElevenLabs TTS", keyAdvantage: "High-quality neural TTS.", capability: ["tts"] },
      ],
    },
  ],
};

// ─── OpenRouter (models routed via OpenRouter API) ─────────────────────────
const openrouter: AIProvider = {
  id: "openrouter",
  name: "OpenRouter",
  logo: "OR",
  accent: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  description: "Unified model access via OpenRouter (speed + quality mix).",
  isDefault: false,
  models: [
    {
      name: "GPT-4o mini",
      apiId: "openai/gpt-4o-mini",
      keyAdvantage: "Fast default for general chat and reasoning-only prompts.",
      capability: ["speed", "reasoning"],
    },
    {
      name: "Claude 3.7 Sonnet",
      apiId: "anthropic/claude-3.7-sonnet",
      keyAdvantage: "Grounded synthesis and polished writing.",
      capability: ["reasoning", "writing"],
    },
    {
      name: "o3-mini-high",
      apiId: "openai/o3-mini-high",
      keyAdvantage: "Higher-quality heavy reasoning when ambiguity/complexity matters.",
      capability: ["reasoning"],
    },
    {
      name: "DeepSeek Chat V3 (Backup)",
      apiId: "deepseek/deepseek-chat-v3-0324",
      keyAdvantage: "Backup reasoning model for degraded-mode and timeout fallback.",
      capability: ["reasoning"],
    },
  ],
};

// ─── Single source of truth ────────────────────────────────────────────────
export const AI_PROVIDERS: AIProvider[] = [
  openai,
  anthropic,
  google,
  meta,
  deepseek,
  alibaba,
  xai,
  mistral,
  zai,
  inception,
  xiaomi,
  openrouter,
  groq,
];

// ─── Helper functions ─────────────────────────────────────────────────────

function getProviderModels(p: AIProvider): AIModelEntry[] {
  if (p.groups) return p.groups.flatMap((g) => g.models);
  return p.models ?? [];
}

/** Returns all models across all providers (flat list with providerId). */
export function getAllModels(): (AIModelEntry & { providerId: string; providerName: string })[] {
  return AI_PROVIDERS.flatMap((p) =>
    getProviderModels(p).map((m) => ({
      ...m,
      providerId: p.id,
      providerName: p.name,
    })),
  );
}

/** Returns models for a given provider id, or empty array if not found. */
export function getModelsByProvider(providerId: string): AIModelEntry[] {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  return provider ? getProviderModels(provider) : [];
}

/** Returns groups for a provider (e.g. Groq → OpenAI, Llama, …). Empty if provider has flat models. */
export function getProviderGroups(providerId: string): AIProviderGroup[] {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  return provider?.groups ?? [];
}

/** Finds a model by name (case-insensitive match). Returns model + provider info or undefined. */
export function findModel(
  modelName: string,
): (AIModelEntry & { providerId: string; providerName: string }) | undefined {
  const normalized = modelName.trim().toLowerCase();
  for (const provider of AI_PROVIDERS) {
    const model = getProviderModels(provider).find((m) => m.name.toLowerCase() === normalized);
    if (model) {
      return {
        ...model,
        providerId: provider.id,
        providerName: provider.name,
      };
    }
  }
  return undefined;
}

/** Find display name for a given apiId (e.g. for selected model label). */
export function getModelNameByApiId(apiId: string): string | undefined {
  const all = getAllModels();
  return all.find((m) => m.apiId === apiId)?.name;
}

/** Section shape for multi-mode column layout: provider → optional group → models. */
export type MultiModeSection = {
  providerName: string;
  groupName?: string;
  models: { id: string; name: string }[];
};

/** Sections for AI Chat multi-mode: grouped by provider and (for Groq) by model family. */
export function getMultiModeSections(
  availableModelIds: Set<string>,
): MultiModeSection[] {
  const out: MultiModeSection[] = [];
  for (const provider of AI_PROVIDERS) {
    const groups = getProviderGroups(provider.id);
    if (groups.length > 0) {
      for (const group of groups) {
        const models = group.models
          .filter((m) => m.apiId && availableModelIds.has(m.apiId))
          .map((m) => ({ id: m.apiId!, name: m.name }));
        if (models.length > 0) {
          out.push({
            providerName: provider.name,
            groupName: group.name,
            models,
          });
        }
      }
    } else {
      const flat = getModelsByProvider(provider.id).filter(
        (m) => m.apiId && availableModelIds.has(m.apiId),
      );
      if (flat.length > 0) {
        out.push({
          providerName: provider.name,
          models: flat.map((m) => ({ id: m.apiId!, name: m.name })),
        });
      }
    }
  }
  return out;
}
