"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_BASE = "/ai-provider%20logo";

const providerLogos: Record<string, string> = {
  openai: `${LOGO_BASE}/openai.png`,
  anthropic: `${LOGO_BASE}/anthropic.png`,
  google: `${LOGO_BASE}/google.webp`,
  xai: `${LOGO_BASE}/grok.webp`,
  meta: `${LOGO_BASE}/meta ai.png`,
  qwen: `${LOGO_BASE}/qwen.png`,
  alibaba: `${LOGO_BASE}/qwen.png`,
  mistral: `${LOGO_BASE}/mistral.webp`,
  deepseek: `${LOGO_BASE}/deepseek.jpg`,
  moonshot: `${LOGO_BASE}/moonshot.png`,
  minimax: `${LOGO_BASE}/minimax.png`,
};

type ModelBlurb = { title: string; description: string };
type ProviderSection = {
  id: string;
  name: string;
  emoji?: string;
  logoKey?: keyof typeof providerLogos;
  logoKeys?: string[];
  latest: ModelBlurb[];
  older: ModelBlurb[];
};

const PROVIDERS: ProviderSection[] = [
  {
    id: "openai",
    name: "OpenAI",
    logoKey: "openai",
    latest: [
      {
        title: "GPT‑5.4 / 5.2 / 5.1 family",
        description:
          "Latest high‑performance general‑purpose models for reasoning, coding, multimodal tasks (2026).",
      },
      {
        title: "GPT‑oss (120B & 20B)",
        description:
          "First open‑weight large models from OpenAI (2025), usable locally and good for experimentation and self‑hosting.",
      },
    ],
    older: [
      {
        title: "GPT‑4.5",
        description:
          "Strong reasoning & general capabilities; offered as a legacy model for many users.",
      },
      {
        title: "GPT‑3.5",
        description:
          "Classic workhorse model; still reliable for many tasks and very cost‑efficient.",
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    emoji: "🤝",
    logoKey: "anthropic",
    latest: [
      {
        title: "Claude Opus 4.5 / Sonnet 4.5 / Haiku 4.5",
        description:
          "Newest, top‑performing variants focused on deep reasoning, research, and agents.",
      },
    ],
    older: [
      {
        title: "Claude 3.5 Sonnet",
        description:
          "Improved speed & efficiency with competitive intelligence benchmarks.",
      },
      {
        title: "Claude 3 (Opus / Sonnet / Haiku)",
        description:
          "Very capable earlier models still used widely for chat, reasoning, and productivity.",
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    emoji: "🟡",
    logoKey: "google",
    latest: [
      {
        title: "Gemini 3.1 Pro / Gemini 3 series",
        description:
          "Current flagship multimodal model with a huge context window and strong reasoning.",
      },
    ],
    older: [
      {
        title: "PaLM 2 (and derivatives like Codey)",
        description:
          "Earlier multi‑purpose Google models available via Vertex AI.",
      },
      {
        title: "Gemini 2.0 Flash / 1.5 Pro",
        description:
          "Still competent for many language and coding applications.",
      },
    ],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    emoji: "🐦",
    logoKey: "xai",
    latest: [
      {
        title: "Grok 4",
        description:
          "Evolved generation with reasoning, coding support and long contexts.",
      },
    ],
    older: [
      {
        title: "Grok‑1 / Grok‑1.5 / Grok‑2",
        description:
          "Earlier versions introduced MoE efficiency and large contexts (128k tokens in Grok‑1.5).",
      },
    ],
  },
  {
    id: "meta",
    name: "Meta (LLaMA)",
    emoji: "🐵",
    logoKey: "meta",
    latest: [
      {
        title: "LLaMA 4 family",
        description:
          "New open models with very high context lengths and performance comparable to top proprietary models.",
      },
    ],
    older: [
      {
        title: "LLaMA 3 / 2 (70B & 13B)",
        description:
          "Classic open models widely used in research and local deployments.",
      },
      {
        title: "Vicuna (based on LLaMA)",
        description:
          "Community‑tuned open chatbots known for lightweight efficiency.",
      },
    ],
  },
  {
    id: "alibaba",
    name: "Alibaba (Qwen)",
    emoji: "🟡",
    logoKey: "alibaba",
    latest: [
      {
        title: "Qwen 3 & 3.5",
        description:
          "Powerful multilingual models with reasoning enhancements.",
      },
    ],
    older: [
      {
        title: "Earlier Qwen series (1.x / 2.x)",
        description:
          "Still useful for general language tasks and cost‑effective deployments.",
      },
    ],
  },
  {
    id: "mistral-deepseek",
    name: "Mistral / DeepSeek / Moonshot / MiniMax",
    emoji: "🧪",
    logoKeys: ["mistral", "deepseek", "moonshot", "minimax"],
    latest: [
      {
        title: "Mistral 3 series",
        description: "Latest open models with competitive capabilities.",
      },
      {
        title: "DeepSeek V3, Moonshot K2/K2.5, MiniMax series",
        description:
          "Emerging high‑performance or high‑context open architectures.",
      },
    ],
    older: [
      {
        title: "Mistral 7B / Mistral Large 2 / Mixtral 8×7B",
        description:
          "Earlier open models that still provide strong performance per compute unit.",
      },
    ],
  },
  {
    id: "other",
    name: "Other Notable Older Models",
    emoji: "🧠",
    latest: [],
    older: [
      {
        title: "PaLM (original)",
        description:
          "Google's early large language foundation that influenced later versions.",
      },
      {
        title: "Wu Dao 2.0",
        description:
          "Massive Chinese multimodal model from BAAI (2021/2022).",
      },
      {
        title: "IBM Granite",
        description:
          "Older foundation model used in enterprise search/chat (2023).",
      },
      {
        title: "Microsoft Phi series",
        description:
          "Smaller models optimized for local deployment and reasoning.",
      },
    ],
  },
];

function ProviderCard({ section }: { section: ProviderSection }) {
  const hasLatest = section.latest.length > 0;
  const hasOlder = section.older.length > 0;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-bg-card overflow-hidden",
        "transition-all duration-200 hover:border-border-hover hover:bg-bg-card-hover",
      )}
    >
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 p-6 sm:p-8">
        {/* Logo / emoji */}
        <div className="flex shrink-0 items-center sm:items-start gap-3">
          {section.logoKeys ? (
            <div className="flex -space-x-1">
              {section.logoKeys.map((key) => (
                <div
                  key={key}
                  className="relative h-12 w-12 rounded-xl border border-border bg-surface-overlay overflow-hidden ring-2 ring-bg-card"
                >
                  <Image
                    src={providerLogos[key] ?? ""}
                    alt=""
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </div>
              ))}
            </div>
          ) : section.logoKey && providerLogos[section.logoKey] ? (
            <div className="relative h-14 w-14 rounded-xl border border-border bg-surface-overlay overflow-hidden">
              <Image
                src={providerLogos[section.logoKey]}
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="56px"
              />
            </div>
          ) : section.emoji && !section.logoKey && !section.logoKeys ? (
            <span className="text-3xl" aria-hidden>
              {section.emoji}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          <h2 className="font-display text-xl font-bold tracking-tight text-text">
            {section.emoji && (
              <span className="mr-2" aria-hidden>
                {section.emoji}
              </span>
            )}
            {section.name}
          </h2>
          {hasLatest && (
            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">
                Latest
              </h3>
              <ul className="space-y-4">
                {section.latest.map((item, i) => (
                  <li key={i}>
                    <p className="font-semibold text-[var(--text-sm)] text-text">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[var(--text-sm)] leading-relaxed text-text-muted">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasOlder && (
            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">
                {section.id === "other"
                  ? "Historically important"
                  : "Older but still useful"}
              </h3>
              <ul className="space-y-4">
                {section.older.map((item, i) => (
                  <li key={i}>
                    <p className="font-semibold text-[var(--text-sm)] text-text">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[var(--text-sm)] leading-relaxed text-text-muted">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AIProvidersPage() {
  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        <header className="mb-10 sm:mb-14">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            AI Providers & Models
          </h1>
          <p className="mt-3 text-[var(--text-lg)] leading-relaxed text-text-muted max-w-2xl">
            A reference of major providers and model families available on Nexora — from latest flagship models to older but still useful options.
          </p>
        </header>

        <div className="space-y-6">
          {PROVIDERS.map((section) => (
            <ProviderCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
