import { AIModel, AIAgent } from "@/types";

export const AVAILABLE_MODELS: AIModel[] = [
  // Production models
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "Groq" },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", provider: "Groq" },
  // Production systems (agentic)
  { id: "groq/compound", name: "Groq Compound", provider: "Groq" },
  { id: "groq/compound-mini", name: "Groq Compound Mini", provider: "Groq" },
  // Preview models
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", provider: "Groq" },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", provider: "Groq" },
  { id: "qwen/qwen3-32b", name: "Qwen3-32B", provider: "Groq" },
  { id: "canopylabs/orpheus-arabic-saudi", name: "Orpheus Arabic Saudi", provider: "Groq" },
  { id: "canopylabs/orpheus-v1-english", name: "Orpheus V1 English", provider: "Groq" },
  { id: "openai/gpt-oss-safeguard-20b", name: "GPT-OSS Safeguard 20B", provider: "Groq" },
];

export const AVAILABLE_AGENTS: AIAgent[] = [
  { id: "ai-chat", name: "AI Chat", icon: "Bot" },
  { id: "researcher", name: "Researcher", icon: "Search" },
  { id: "coder", name: "Developer", icon: "Code2" },
  { id: "analyst", name: "Analyst", icon: "BarChart3" },
];
