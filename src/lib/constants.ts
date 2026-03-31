import { AIModel, AIAgent } from "@/types";

/**
 * Chat-capable models only (Groq chat completion API).
 * Excludes TTS/STT models (e.g. Orpheus, Whisper) which use different endpoints and do not reply to chat.
 */
export const AVAILABLE_MODELS: AIModel[] = [
  // OpenRouter (minimal lineup)
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini (OpenRouter)",
    provider: "OpenRouter",
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet (OpenRouter)",
    provider: "OpenRouter",
  },
  {
    id: "openai/o3-mini-high",
    name: "o3-mini-high (OpenRouter)",
    provider: "OpenRouter",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek Chat V3 (Backup) (OpenRouter)",
    provider: "OpenRouter",
  },

  // Groq (testing baseline)
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "Groq" },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", provider: "Groq" },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    provider: "Groq",
  },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", provider: "Groq" },
  { id: "qwen/qwen3-32b", name: "Qwen3-32B", provider: "Groq" },
  {
    id: "openai/gpt-oss-safeguard-20b",
    name: "GPT-OSS Safeguard 20B",
    provider: "Groq",
  },
];

export const AVAILABLE_AGENTS: AIAgent[] = [
  { id: "omni", name: "Omni Agent", icon: "Bot" },
  { id: "aichat", name: "AI Chat", icon: "Sparkles" },
  { id: "researcher", name: "Researcher", icon: "Search" },
  { id: "coder", name: "Developer", icon: "Code2" },
  { id: "analyst", name: "Analyst", icon: "BarChart3" },
];

/**
 * When false, multi-model consensus is disabled (client + server). Re-enable after
 * single-mode + compare are stable.
 */
export const AI_CHAT_CONSENSUS_ENABLED = false;
