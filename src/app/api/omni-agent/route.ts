/**
 * POST /api/omni-agent — OmniAgent streaming endpoint.
 *
 * Implements a full intelligence pipeline:
 *   1. Query Analysis   — classify intent, decide if web search is needed
 *   2. Web Search       — Multi-source search (Tavily + Brave)
 *   3. Deep Analysis    — extract key facts from search results
 *   4. Fact Checking    — cross-reference across sources
 *   5. Research Synthesis — build research context
 *   6. Answer Generation — LLM streams the final answer
 *
 * Pipeline progress is sent as the first text section of the streamed response
 * so the user sees each step happening in real time.  Detailed metadata is also
 * returned in X-Pipeline-Data response header.
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateText,
} from "ai";
import { z } from "zod";
import { createGroq } from "@ai-sdk/groq";
import { OMNI_MODELS } from "@/lib/omni-router";
import { getNexoraSystemPrompt } from "@/lib/nexora-system-prompt";
import { getOpenRouter } from "@/lib/ai/providers";
import { OPENROUTER_OMNI_MODEL_MAP } from "@/lib/ai/openrouter-models";
import {
  type TavilySearchResponse,
  type TavilyResult,
} from "@/lib/search";
import { buildQueryPlan } from "@/lib/omni/planner";
import {
  buildRepoEvidenceBlock,
  formatDirectUrlPageExtractionReport,
  parseRepoEvidence,
  parseDirectUrlEvidence,
  runRetrievalPlan,
} from "@/lib/omni/retrieval";
import { buildEnhancedSystemPrompt } from "@/lib/omni/prompt-builder";
import type { QueryAnalysis, RepoParsedEvidence, DirectUrlParsedEvidence } from "@/lib/omni/types";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

type OmniProviderName = "groq" | "openrouter";
type RouteModelKey = keyof typeof OMNI_MODELS;

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant" | "system"; content: string };

type IncomingMessage = {
  role?: string;
  content?: string;
  parts?: unknown[];
};

interface PipelineStep {
  name: string;
  status: "done" | "error" | "skipped";
  detail?: string;
  durationMs?: number;
}

interface ClaimVerification {
  claim: string;
  supportCount: number;
  confidence: "high" | "medium" | "low";
}

interface FactCheckSummary {
  verified: boolean;
  notes: string;
  claimChecks: ClaimVerification[];
}

type RetrievalQuality = "high" | "limited" | "none";

type GenerationModel = Parameters<typeof generateText>[0]["model"];
type ModelFactory = ReturnType<typeof createModelFactory>;

type RouteCandidate = {
  provider: OmniProviderName;
  modelId: string;
  routeKey: RouteModelKey;
};

type RouteLatencyStats = {
  firstTokenMsAvg: number;
  completeMsAvg: number;
  samples: number;
};

const routeLatencyStats = new Map<string, RouteLatencyStats>();
const DEFAULT_FIRST_TOKEN_TIMEOUT_MS = Number(
  process.env.OMNI_FIRST_TOKEN_TIMEOUT_MS ?? "9000",
);

type UserPersona = "student" | "developer" | "business" | "general";

function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value);
}

function detectUserPersona(userQuery: string): UserPersona {
  const q = userQuery.toLowerCase();
  if (
    /(code|debug|bug|typescript|javascript|python|api|backend|frontend|database|function|class|repo|deploy)/i.test(
      q,
    )
  ) {
    return "developer";
  }
  if (
    /(student|study|exam|assignment|homework|thesis|research paper|notes|learn)/i.test(
      q,
    )
  ) {
    return "student";
  }
  if (
    /(business|startup|revenue|sales|marketing|strategy|operations|investor|pitch|kpi|roi)/i.test(
      q,
    )
  ) {
    return "business";
  }
  return "general";
}

function isComparisonStyleQuery(query: string): boolean {
  return /\b(compare|comparison|vs|versus|pricing|price|difference|which is better)\b/i.test(
    query,
  );
}

function getHeuristicAnalysis(question: string): QueryAnalysis | null {
  const q = question.toLowerCase();
  const hasGithub = /github\.com\/[^/\s]+\/[^/\s]+/.test(q);
  const hasUrl = /https?:\/\/\S+/.test(q);
  const comparison = isComparisonStyleQuery(question);
  const current = /\b(latest|today|current|recent|news)\b/i.test(q);

  if (hasGithub) {
    return {
      category: "coding",
      needsWebSearch: true,
      searchQuery: question,
      reasoning: "Heuristic: GitHub repo analysis needs retrieval-first path.",
      recommendedModel: "coding",
    };
  }

  if (comparison || current) {
    return {
      category: "research",
      needsWebSearch: true,
      searchQuery: question,
      reasoning:
        "Heuristic: comparison/current-info query, use retrieval with fast synthesis.",
      recommendedModel: "complexWriting",
    };
  }

  if (hasUrl) {
    return {
      category: "research",
      needsWebSearch: true,
      searchQuery: question,
      reasoning: "Heuristic: URL provided, retrieval-first path.",
      recommendedModel: "complexWriting",
    };
  }

  return null;
}

function rewriteGenericPhrases(text: string): string {
  const replacements: Array<[RegExp, string]> = [
    [
      /\bAI is transforming[^.]*\./gi,
      "The practical impact here is measurable: faster execution, lower manual effort, and better decision quality.",
    ],
    [
      /\bit depends on your use case\b/gi,
      "The best path depends on your constraints: speed, budget, and required accuracy.",
    ],
    [
      /\bthere are many factors to consider\b/gi,
      "Focus on the highest-leverage factors first: risk, effort, and expected outcome.",
    ],
    [/\bin conclusion,?\b/gi, "Bottom line:"],
  ];

  return replacements.reduce(
    (acc, [pattern, value]) => acc.replace(pattern, value),
    text,
  );
}

function normalizeMarkdownTableBlock(block: string): string {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !lines.every((line) => line.includes("|"))) {
    return block;
  }

  const rows = lines.map((line) => {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(
        (_, i, arr) =>
          !(i === 0 && arr[0] === "") &&
          !(i === arr.length - 1 && arr[arr.length - 1] === ""),
      );
    return cells;
  });

  const colCount = Math.max(...rows.map((r) => r.length));
  const normalizedRows = rows.map((row) => {
    const padded = [...row];
    while (padded.length < colCount) padded.push("");
    return padded;
  });

  const widths = Array.from({ length: colCount }, (_, col) =>
    Math.max(...normalizedRows.map((row) => row[col]?.length ?? 0), 3),
  );

  const header = normalizedRows[0] || [];
  const headerLine = `| ${header
    .map((cell, i) => (cell || " ").padEnd(widths[i]!))
    .join(" | ")} |`;
  const dividerLine = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;

  const bodyLines = normalizedRows
    .slice(1)
    .map(
      (row) =>
        `| ${row.map((cell, i) => (cell || " ").padEnd(widths[i]!)).join(" | ")} |`,
    );

  return [headerLine, dividerLine, ...bodyLines].join("\n");
}

function normalizeMarkdownTables(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i]?.includes("|")) {
      const block: string[] = [];
      while (i < lines.length && lines[i]?.includes("|")) {
        block.push(lines[i]!);
        i++;
      }
      out.push(normalizeMarkdownTableBlock(block.join("\n")));
      continue;
    }

    out.push(lines[i]!);
    i++;
  }

  return out.join("\n");
}

function toCleanMarkdown(text: string): string {
  const compact = text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!compact) return "";

  const hasHeading = /^#{2,3}\s+/m.test(compact);
  const paragraphs = compact
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const transformed = paragraphs.map((p, idx) => {
    if (/^#{1,6}\s+/.test(p) || /^[-*]\s+/.test(p) || /^\d+\.\s+/.test(p)) {
      return p;
    }

    // Convert long narrative blocks into concise bullets.
    if (p.length > 220 || p.split(". ").length > 2) {
      const sentences = p
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      return sentences.map((s) => `- ${s}`).join("\n");
    }

    // Keep short concise paragraphs readable.
    if (idx === 0 && !hasHeading) {
      return `## Key Response\n${p}`;
    }

    return p;
  });

  return normalizeMarkdownTables(transformed.join("\n\n"));
}

function buildPersonaHint(userQuery: string): string {
  const persona = detectUserPersona(userQuery);
  if (persona === "developer") {
    return "### Tailored Note\n- Prioritize implementation-ready guidance with technical trade-offs and concrete next steps.";
  }
  if (persona === "student") {
    return "### Tailored Note\n- Focus on clarity, core concepts, and a study-friendly explanation you can revise quickly.";
  }
  if (persona === "business") {
    return "### Tailored Note\n- Emphasize outcomes, risks, and execution impact on time, cost, and growth.";
  }
  return "### Tailored Note\n- Keep guidance practical, concise, and immediately actionable.";
}

function buildExecutionBlocks(userQuery: string): string {
  const q = userQuery.toLowerCase();
  const actions: string[] = [];

  actions.push("📄 Export this as PDF");

  if (/(presentation|pitch|deck|slides|powerpoint)/i.test(q)) {
    actions.push("📊 Convert this into a PowerPoint presentation");
  } else if (/(compare|analysis|report|metrics|data)/i.test(q)) {
    actions.push("📊 Convert this into a summary report deck");
  } else {
    actions.push("📊 Convert this into a PowerPoint presentation");
  }

  if (/(email|mail|message|reply|follow up)/i.test(q)) {
    actions.push("✉️ Turn this into an email draft");
  } else {
    actions.push("✉️ Draft an email version of this response");
  }

  if (/(code|debug|implement|build|api|architecture)/i.test(q)) {
    actions.push("🧠 Ask follow-up questions for implementation details");
  } else {
    actions.push("🧠 Ask follow-up questions");
  }

  const uniqueActions = [...new Set(actions)];
  const bullets = uniqueActions.map((action) => `- ${action}`).join("\n");
  return `---\n### 🚀 Next Actions\n${bullets}`;
}

function postProcessResponse(rawText: string, userQuery: string): string {
  const rewritten = rewriteGenericPhrases(rawText);
  const markdown = toCleanMarkdown(rewritten);
  const personaHint = buildPersonaHint(userQuery);
  const executionBlocks = buildExecutionBlocks(userQuery);

  return [markdown, personaHint, executionBlocks]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function maybeRefineWithLightweightAI(
  draftText: string,
  userQuery: string,
  model: GenerationModel,
): Promise<string> {
  if (process.env.OMNI_POSTPROCESS_REFINE !== "true") {
    return draftText;
  }

  try {
    const { text } = await generateText({
      model,
      system:
        "You are a fast response editor. Improve readability and clarity while keeping meaning intact. Return markdown only.",
      prompt: `User query: ${userQuery}\n\nDraft response:\n${draftText}`,
    });
    return text.trim() || draftText;
  } catch {
    return draftText;
  }
}

function getOmniProvider(requestedProvider: string | null): OmniProviderName {
  if (requestedProvider === "openrouter" || requestedProvider === "groq") {
    return requestedProvider;
  }
  // Groq is the default during Omni stabilization/testing.
  return process.env.OMNI_PROVIDER === "openrouter" ? "openrouter" : "groq";
}

function getModelIdForProvider(
  provider: OmniProviderName,
  routeKey: keyof typeof OMNI_MODELS,
): string {
  const legacyAliases: Record<string, string> = {
    "moonshotai/kimi-k2:free": "moonshotai/kimi-k2.5",
    "deepseek/deepseek-chat-v3-0324:free": "deepseek/deepseek-chat-v3-0324",
  };

  if (provider === "openrouter") {
    const envMap: Record<keyof typeof OMNI_MODELS, string | undefined> = {
      coding: process.env.OPENROUTER_OMNI_MODEL_CODING,
      heavyReasoning: process.env.OPENROUTER_OMNI_MODEL_HEAVY_REASONING,
      complexWriting: process.env.OPENROUTER_OMNI_MODEL_COMPLEX_WRITING,
      simple: process.env.OPENROUTER_OMNI_MODEL_SIMPLE,
    };
    const chosen = envMap[routeKey] || OPENROUTER_OMNI_MODEL_MAP[routeKey];
    return legacyAliases[chosen] || chosen;
  }

  return OMNI_MODELS[routeKey];
}

function createModelFactory(provider: OmniProviderName) {
  if (provider === "openrouter") {
    return getOpenRouter();
  }
  return groq;
}

function buildRouteCandidates(
  preferredProvider: OmniProviderName,
  routeKey: RouteModelKey,
): RouteCandidate[] {
  const openRouterPrimary: Record<RouteModelKey, string[]> = {
    coding: [
      getModelIdForProvider("openrouter", "coding"),
      getModelIdForProvider("openrouter", "heavyReasoning"),
      getModelIdForProvider("openrouter", "simple"),
    ],
    heavyReasoning: [
      getModelIdForProvider("openrouter", "heavyReasoning"),
      getModelIdForProvider("openrouter", "complexWriting"),
      getModelIdForProvider("openrouter", "simple"),
    ],
    complexWriting: [
      getModelIdForProvider("openrouter", "complexWriting"),
      getModelIdForProvider("openrouter", "heavyReasoning"),
      getModelIdForProvider("openrouter", "simple"),
    ],
    simple: [
      getModelIdForProvider("openrouter", "simple"),
      getModelIdForProvider("openrouter", "complexWriting"),
    ],
  };

  const groqBaseline: RouteCandidate[] = [
    {
      provider: "groq",
      modelId: getModelIdForProvider("groq", routeKey),
      routeKey,
    },
    {
      provider: "groq",
      modelId: getModelIdForProvider("groq", "simple"),
      routeKey: "simple",
    },
  ];

  const openRouterCandidates = [...new Set(openRouterPrimary[routeKey])].map(
    (modelId) =>
      ({
        provider: "openrouter" as const,
        modelId,
        routeKey,
      }) satisfies RouteCandidate,
  );

  // Keep provider routing isolated during stability testing.
  // Groq remains the default test path; OpenRouter is opt-in via header/toggle.
  return preferredProvider === "groq" ? groqBaseline : openRouterCandidates;
}

function routeCandidateKey(candidate: RouteCandidate): string {
  return `${candidate.provider}:${candidate.modelId}`;
}

function rankRouteCandidates(candidates: RouteCandidate[]): RouteCandidate[] {
  return [...candidates].sort((a, b) => {
    const sa = routeLatencyStats.get(routeCandidateKey(a));
    const sb = routeLatencyStats.get(routeCandidateKey(b));
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    const aScore = sa.firstTokenMsAvg * 0.7 + sa.completeMsAvg * 0.3;
    const bScore = sb.firstTokenMsAvg * 0.7 + sb.completeMsAvg * 0.3;
    return aScore - bScore;
  });
}

function updateRouteLatency(
  candidate: RouteCandidate,
  firstTokenMs: number,
  completeMs: number,
) {
  const key = routeCandidateKey(candidate);
  const current = routeLatencyStats.get(key);
  if (!current) {
    routeLatencyStats.set(key, {
      firstTokenMsAvg: firstTokenMs,
      completeMsAvg: completeMs,
      samples: 1,
    });
    return;
  }
  const samples = current.samples + 1;
  const alpha = Math.min(0.35, 2 / (samples + 1));
  routeLatencyStats.set(key, {
    firstTokenMsAvg: Math.round(
      current.firstTokenMsAvg * (1 - alpha) + firstTokenMs * alpha,
    ),
    completeMsAvg: Math.round(
      current.completeMsAvg * (1 - alpha) + completeMs * alpha,
    ),
    samples,
  });
}

// ─── Query analysis ─────────────────────────────────────────────────────────

async function analyzeQuery(
  question: string,
  model: GenerationModel,
): Promise<QueryAnalysis> {
  const analysisSchema = z.object({
    category: z.enum([
      "coding",
      "technical",
      "research",
      "current-events",
      "creative",
      "general",
    ]),
    needsWebSearch: z.boolean(),
    searchQuery: z.string(),
    reasoning: z.string(),
    recommendedModel: z.enum([
      "coding",
      "heavyReasoning",
      "complexWriting",
      "simple",
    ]),
  });

  try {
    const { text } = await generateText({
      model,
      system: `You are the OmniAgent Query Classifier. Your job is to analyze the user's intent and determine the best execution path.
      
      Categories:
      - coding: Code snippets, debugging, architectural patterns, syntax.
      - technical: System design, deep tech, math, engineering.
      - research: In-depth information gathering, comparisons, facts.
      - current-events: News, recent updates, real-time data.
      - creative: Creative writing, stories, brainstorming.
      - general: Everyday questions, small talk.

      Web Search Criteria:
      Set needsWebSearch to true if the question asks about:
      1. Recent events (post-2023) or real-time measurements (stocks, weather).
      2. Specific facts, people, or entities that may need verification.
      3. "How-to" guides for tools/software that change frequently.
      4. Recommendations or comparisons of products/services.

      Model Routing:
      - "coding": for all code-related tasks.
      - "heavyReasoning": for complex logic, system design, or deep math.
      - "complexWriting": for creative pieces or long-form synthesis.
      - "simple": for everything else.

      Return ONLY valid JSON with this exact shape:
      {
        "category": "coding|technical|research|current-events|creative|general",
        "needsWebSearch": boolean,
        "searchQuery": string,
        "reasoning": string,
        "recommendedModel": "coding|heavyReasoning|complexWriting|simple"
      }
      Do not include markdown, code fences, or extra keys.`,
      prompt: `User Message: "${question}"`,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Classifier returned non-JSON response");

    const parsed = JSON.parse(jsonMatch[0]);
    const object = analysisSchema.parse(parsed);

    return object;
  } catch (err) {
    console.error("AI Analysis failed, falling back to basic analysis:", err);
    // Fallback logic
    const q = question.toLowerCase();
    const needsSearch =
      /\b(today|now|current|latest|recent|news|who is|price of|weather|vs|compare)\b/i.test(
        q,
      );
    return {
      category: "general",
      needsWebSearch: needsSearch,
      searchQuery: question,
      reasoning: "AI analysis failed, used fallback keyword detection.",
      recommendedModel: "simple",
    };
  }
}

// ─── Deep analysis & fact-checking helpers ──────────────────────────────────

function deepAnalyze(results: TavilyResult[]): string {
  if (!results.length) return "";

  const keyFacts: string[] = [];
  const sources: string[] = [];

  for (const r of results) {
    sources.push(
      `- [${r.title}](${r.url}) (relevance: ${(r.score * 100).toFixed(0)}%)`,
    );
    if (r.content) {
      keyFacts.push(`• ${r.content.slice(0, 300).trim()}`);
    }
  }

  return [
    "## Key Facts Extracted",
    keyFacts.join("\n"),
    "",
    "## Source Credibility",
    summarizeSourceCredibility(results),
    "",
    "## Sources",
    sources.join("\n"),
  ].join("\n");
}

function lightweightResearchSummary(results: TavilyResult[]): string {
  if (!results.length) return "";
  const top = results.slice(0, 4);
  const lines = top.map(
    (r, i) =>
      `${i + 1}. ${r.title} — ${r.content.slice(0, 180).replace(/\s+/g, " ").trim()} (${r.url})`,
  );
  return ["## Key Retrieved Points", ...lines].join("\n");
}

function capSourcesForSynthesis(
  response: TavilySearchResponse,
  maxSources: number,
): TavilySearchResponse {
  if (response.results.length <= maxSources) return response;

  const officialVendorDomains = [
    "openrouter.ai",
    "groq.com",
    "docs.groq.com",
    "platform.openai.com",
    "openai.com",
    "anthropic.com",
    "docs.anthropic.com",
    "ai.google.dev",
    "cloud.google.com",
  ];

  const canonicalizeDomain = (url: string): string =>
    getDomain(url).replace(/^docs\./, "").replace(/^www\./, "");
  const isOfficial = (url: string): boolean => {
    const domain = canonicalizeDomain(url);
    return officialVendorDomains.some(
      (d) => domain === d || domain.endsWith(`.${d}`),
    );
  };
  const normalizeTitle = (title: string): string =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const similarityKey = (r: TavilyResult): string => {
    const d = canonicalizeDomain(r.url);
    const t = normalizeTitle(r.title)
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 6)
      .join(" ");
    return `${d}::${t}`;
  };

  const sorted = [...response.results].sort((a, b) => {
    const officialDelta = Number(isOfficial(b.url)) - Number(isOfficial(a.url));
    if (officialDelta !== 0) return officialDelta;
    return b.score - a.score;
  });

  const deduped: TavilyResult[] = [];
  const seenKeys = new Set<string>();
  const seenUrls = new Set<string>();
  for (const r of sorted) {
    const cleanUrl = r.url.split("#")[0]?.replace(/\/+$/, "") ?? r.url;
    const key = similarityKey(r);
    if (seenUrls.has(cleanUrl) || seenKeys.has(key)) continue;
    seenUrls.add(cleanUrl);
    seenKeys.add(key);
    deduped.push(r);
    if (deduped.length >= maxSources) break;
  }

  return {
    ...response,
    results: deduped,
  };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}





function scoreDomainCredibility(domain: string): number {
  if (!domain) return 0;

  const highTrustPatterns = [
    /\.gov$/,
    /\.edu$/,
    /\.ac\./,
    /wikipedia\.org$/,
    /reuters\.com$/,
    /apnews\.com$/,
    /bbc\.com$/,
    /who\.int$/,
    /un\.org$/,
    /openrouter\.ai$/,
    /groq\.com$/,
    /docs\.groq\.com$/,
  ];
  const lowTrustPatterns = [/blogspot\./, /medium\.com$/, /reddit\.com$/];

  if (highTrustPatterns.some((p) => p.test(domain))) return 1;
  if (lowTrustPatterns.some((p) => p.test(domain))) return 0.35;
  return 0.65;
}

function enrichWithCredibility(results: TavilyResult[]): TavilyResult[] {
  return results.map((r) => {
    const domain = getDomain(r.url);
    const credibility = scoreDomainCredibility(domain);
    const adjustedScore = Number(
      (r.score * 0.7 + credibility * 0.3).toFixed(3),
    );
    return {
      ...r,
      score: adjustedScore,
    };
  });
}

function summarizeSourceCredibility(results: TavilyResult[]): string {
  if (!results.length) return "No sources available.";

  const lines = results.slice(0, 5).map((r) => {
    const domain = getDomain(r.url) || "unknown";
    const trust = Math.round(scoreDomainCredibility(domain) * 100);
    return `- ${domain} (trust ${trust}%, blended relevance ${(r.score * 100).toFixed(0)}%)`;
  });

  return lines.join("\n");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3);
}

function extractCandidateClaims(
  results: TavilyResult[],
  maxClaims = 6,
): string[] {
  const claims: string[] = [];

  for (const result of results) {
    const sentences = result.content
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40 && s.length <= 220);

    for (const sentence of sentences) {
      const normalized = sentence.replace(/\s+/g, " ").trim();
      if (!claims.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
        claims.push(normalized);
      }
      if (claims.length >= maxClaims) return claims;
    }
  }

  return claims;
}

function verifyClaimsAgainstSources(
  claims: string[],
  results: TavilyResult[],
): ClaimVerification[] {
  return claims.map((claim) => {
    const claimTokens = new Set(tokenize(claim));
    const supportCount = results.reduce((count, source) => {
      const sourceTokens = new Set(tokenize(source.content));
      const overlap = [...claimTokens].filter((token) =>
        sourceTokens.has(token),
      );
      return count + (overlap.length >= 3 ? 1 : 0);
    }, 0);

    let confidence: "high" | "medium" | "low" = "low";
    if (supportCount >= 3) confidence = "high";
    else if (supportCount >= 2) confidence = "medium";

    return {
      claim,
      supportCount,
      confidence,
    };
  });
}

function renderClaimChecks(claimChecks: ClaimVerification[]): string {
  if (!claimChecks.length) return "No claim checks generated.";

  return claimChecks
    .map(
      (c, i) =>
        `${i + 1}. (${c.confidence.toUpperCase()}) ${c.claim} [supporting sources: ${c.supportCount}]`,
    )
    .join("\n");
}

function isExtractionStyleRepoPrompt(query: string): boolean {
  return /\b(extract|exact|list|show|inspect|read)\b/i.test(query) &&
    /\b(package\.json|scripts|env|environment variables|api routes|docs\/api|milestones)\b/i.test(
      query,
    );
}

function isStrictPageSummaryPrompt(query: string): boolean {
  return /\b(summarize|summary|read|analyze|inspect|review|what does this page say|extract key points|headings|list the headings|main sections|visible sections|extract main sections|explicitly stated|only what is explicitly stated)\b/i.test(
    query,
  );
}

function isDirectUrlExtractionStylePrompt(query: string): boolean {
  return (
    /\b(headings|list the headings|main sections|visible sections|extract main sections)\b/i.test(
      query,
    ) ||
    /\b(only what is explicitly stated|explicitly stated)\b/i.test(query)
  );
}

function assessRetrievalQuality(params: {
  retrievalStrategy: string;
  evidenceSourceCount: number;
  fallbackUsed: boolean;
  attempts: Array<{ success: boolean; error?: string; target: string }>;
}): { quality: RetrievalQuality; note?: string } {
  const { retrievalStrategy, evidenceSourceCount, fallbackUsed, attempts } = params;
  if (evidenceSourceCount <= 0) {
    return { quality: "none", note: "No usable retrieval evidence extracted." };
  }

  if (retrievalStrategy === "direct_url_fetch") {
    const shellSignals = attempts.some((a) =>
      /shell-only|low-content|rendered retry|rendered mirror/i.test(
        `${a.error ?? ""} ${a.target}`,
      ),
    );
    if (shellSignals || fallbackUsed) {
      return {
        quality: "limited",
        note: "Partial page content extracted; dynamic content limitations may apply.",
      };
    }
  }

  return { quality: "high" };
}

function formatRepoInspectionReport(parsed: RepoParsedEvidence): string {
  const cleanInlineCode = (value: string): string =>
    value.replace(/^`+|`+$/g, "").trim();

  const scripts = Object.entries(parsed.scripts)
    .map(([k, v]) => `- \`${cleanInlineCode(k)}\`: \`${cleanInlineCode(v)}\``)
    .join("\n");
  const envVars = parsed.envVars
    .map((v) => `- \`${cleanInlineCode(v)}\``)
    .join("\n");
  const routes = parsed.apiRoutes
    .map((r) => `- \`${cleanInlineCode(r)}\``)
    .join("\n");

  return [
    "## Extracted npm scripts",
    scripts || "- none",
    "",
    "## Extracted environment variables",
    envVars || "- none",
    "",
    "## Documented API routes",
    routes || "- none",
  ].join("\n");
}

function factCheck(results: TavilyResult[]): FactCheckSummary {
  if (results.length < 2) {
    return {
      verified: false,
      notes: "Only one source available — limited cross-referencing.",
      claimChecks: [],
    };
  }

  const contents = results.map((r) => r.content.toLowerCase());
  let agreementCount = 0;

  for (let i = 0; i < contents.length - 1; i++) {
    for (let j = i + 1; j < contents.length; j++) {
      const wordsA = new Set(
        contents[i]!.split(/\s+/).filter((w) => w.length > 4),
      );
      const wordsB = new Set(
        contents[j]!.split(/\s+/).filter((w) => w.length > 4),
      );
      const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
      if (overlap > 3) agreementCount++;
    }
  }

  const verified = agreementCount > 0;
  const claimChecks = verifyClaimsAgainstSources(
    extractCandidateClaims(results),
    results,
  );
  const highOrMedium = claimChecks.filter(
    (c) => c.confidence === "high" || c.confidence === "medium",
  ).length;
  const notes = verified
    ? `Cross-referenced ${results.length} sources with ${agreementCount} agreement(s). Claim checks passing: ${highOrMedium}/${claimChecks.length || 0}.`
    : `${results.length} sources checked — limited agreement found; treat with caution. Claim checks passing: ${highOrMedium}/${claimChecks.length || 0}.`;

  return { verified, notes, claimChecks };
}

// ─── Message helpers ────────────────────────────────────────────────────────

function getTextFromParts(parts: unknown[] | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (p): p is { type: string; text?: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: string }).type === "text",
    )
    .map((p) => (p as { text?: string }).text ?? "")
    .join("");
}

function getLastUserContent(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as
      | { role?: string; content?: string; parts?: unknown[] }
      | undefined;
    if (m?.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    const fromParts = getTextFromParts(m.parts);
    if (fromParts) return fromParts;
  }
  return "";
}

function toModelMessages(messages: IncomingMessage[]): Message[] {
  return messages
    .filter(
      (m): m is IncomingMessage & { role: "user" | "assistant" | "system" } =>
        m.role === "user" || m.role === "assistant" || m.role === "system",
    )
    .map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : getTextFromParts(m.parts) || "(empty)",
    })) as Message[];
}

// ─── System prompt builder ──────────────────────────────────────────────────

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const requestedProvider = req.headers.get("x-omni-provider");
    const requestId =
      req.headers.get("x-omni-request-id") ?? `srv-${Date.now()}`;
    const body = (await req.json()) as { messages?: IncomingMessage[] };
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = toModelMessages(raw);
    const lastContent = getLastUserContent(raw);
    const pipelineSteps: PipelineStep[] = [];
    const t0 = Date.now();

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║         OMNI AGENT PIPELINE START         ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log(`  Request ID: ${requestId}`);
    console.log(
      `  Prompt: "${lastContent.slice(0, 100)}${lastContent.length > 100 ? "..." : ""}"`,
    );

    const preferredProvider = getOmniProvider(requestedProvider);
    const openRouterFactory = createModelFactory("openrouter");
    const groqFactory = createModelFactory("groq");
    const simpleModelId = getModelIdForProvider("openrouter", "simple");
    const simpleModel = openRouterFactory(
      simpleModelId as Parameters<typeof groq>[0],
    );

    console.log("  [1/6] 🔍 Analyzing query...");
    const analysisStartMs = Date.now();
    const heuristic = getHeuristicAnalysis(lastContent);
    const initialAnalysis = heuristic ?? (await analyzeQuery(lastContent, simpleModel));
    console.log(
      `        ✅ Analysis source: ${heuristic ? "heuristic-fast-path" : "model-classifier"} (${Date.now() - analysisStartMs}ms)`,
    );
    const queryPlan = buildQueryPlan(lastContent, initialAnalysis);
    const analysis = {
      ...initialAnalysis,
      needsWebSearch:
        queryPlan.retrievalStrategy !== "none" &&
        queryPlan.retrievalStrategy !== "file_parse" &&
        queryPlan.retrievalStrategy !== "ocr",
      searchQuery: queryPlan.searchQuery || initialAnalysis.searchQuery,
      reasoning: queryPlan.reasoning,
      recommendedModel: queryPlan.recommendedModel,
    };

    // Override the hardcoded router if we have a recommendation from the classifier
    const recommendedKey = queryPlan.recommendedModel;
    const providerCandidates = buildRouteCandidates(
      preferredProvider,
      recommendedKey,
    );
    const rankedCandidates =
      preferredProvider === "groq"
        ? rankRouteCandidates(providerCandidates)
        : providerCandidates;
    const primaryCandidate = rankedCandidates[0]!;
    const fallbackCandidate = rankedCandidates[1];
    const providerName = primaryCandidate.provider;
    const modelId = primaryCandidate.modelId;
    const modelFactory =
      providerName === "openrouter" ? openRouterFactory : groqFactory;
    const reason = `AI Classifier: ${analysis.reasoning}`;

    console.log(`        ✅ Category: ${analysis.category}`);
    console.log(`        ✅ Web Search: ${analysis.needsWebSearch}`);
    console.log(
      `        ✅ Routed to: ${analysis.recommendedModel} (${modelId})`,
    );
    if (fallbackCandidate) {
      console.log(
        `        🛟 First-token fallback: ${fallbackCandidate.provider}/${fallbackCandidate.modelId}`,
      );
    }

    const step1Time = Date.now() - t0;
    pipelineSteps.push({
      name: "Query Analysis",
      status: "done",
      detail: analysis.reasoning,
      durationMs: step1Time,
    });

    // ── Step 2: Retrieval (strategy-driven) ─────────────────────────────
    let searchResponse: TavilySearchResponse | null = null;
    let repoEvidenceBlock: string | undefined;
    let parsedRepoEvidence: RepoParsedEvidence | undefined;
    let parsedDirectUrlEvidence: DirectUrlParsedEvidence | undefined;
    let webSearchUsed = false;
    let retrievalQuality: RetrievalQuality = "high";
    let retrievalQualityNote: string | undefined;
    let retrievalLog:
      | {
          fallbackUsed: boolean;
          evidence: { sources: Array<unknown> };
          attempts?: Array<{ success: boolean; error?: string; target: string }>;
        }
      | undefined;

    if (analysis.needsWebSearch) {
      console.log(`  [2/6] 🌐 Retrieval strategy: ${queryPlan.retrievalStrategy}`);
      const t2 = Date.now();
      try {
        const retrieval = await runRetrievalPlan(queryPlan, lastContent);
        retrievalLog = retrieval.log;
        const quality = assessRetrievalQuality({
          retrievalStrategy: queryPlan.retrievalStrategy,
          evidenceSourceCount: retrieval.log.evidence.sources.length,
          fallbackUsed: retrieval.log.fallbackUsed,
          attempts: retrieval.log.attempts,
        });
        retrievalQuality = quality.quality;
        retrievalQualityNote = quality.note;
        searchResponse = retrieval.searchResponse;
        webSearchUsed =
          retrieval.log.strategyChosen === "web_search" ||
          retrieval.log.fallbackUsed;
        const step2Time = Date.now() - t2;

        console.log(
          `        ✅ Strategy chosen: ${retrieval.log.strategyChosen} | fallback used: ${retrieval.log.fallbackUsed}`,
        );
        for (const attempt of retrieval.log.attempts) {
          console.log(
            `        ${attempt.success ? "✅" : "❌"} attempt ${attempt.strategy} -> ${attempt.target}${attempt.error ? ` (${attempt.error})` : ""}`,
          );
        }
        if (retrieval.log.evidence.extractedFields.length) {
          console.log(
            `        ✅ Evidence extracted: ${retrieval.log.evidence.extractedFields.join(", ")}`,
          );
        }
        if (queryPlan.retrievalStrategy === "repo_fetch") {
          const parsed = parseRepoEvidence(retrieval.log.evidence);
          parsedRepoEvidence = parsed;
          repoEvidenceBlock = buildRepoEvidenceBlock(parsed);
          console.log(
            `        ✅ Parsed repo evidence: scripts=${Object.keys(parsed.scripts).length}, env=${parsed.envVars.length}, routes=${parsed.apiRoutes.length}`,
          );
        }

        if (queryPlan.retrievalStrategy === "direct_url_fetch") {
          const parsed = parseDirectUrlEvidence(retrieval.log.evidence);
          parsedDirectUrlEvidence = parsed;
          console.log(
            `        ✅ Parsed direct page headings: ${parsed.headings.length} | meaningful=${parsed.isMeaningful}`,
          );
        }

        if (!searchResponse) {
          throw new Error("No retrieval evidence or search results were returned");
        }

        pipelineSteps.push({
          name: "Retrieval",
          status: "done",
          detail: `Found ${searchResponse.results.length} evidence-backed results (strategy: ${retrieval.log.strategyChosen})`,
          durationMs: step2Time,
        });
        console.log(
          `        ✅ ${searchResponse.results.length} results (${step2Time}ms)`,
        );
      } catch (err) {
        const step2Time = Date.now() - t2;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        pipelineSteps.push({
          name: "Retrieval",
          status: "error",
          detail: errMsg,
          durationMs: step2Time,
        });
        console.log(`        ❌ Search failed: ${errMsg} (${step2Time}ms)`);
      }
    } else {
      retrievalQuality = "high";
      pipelineSteps.push({
        name: "Retrieval",
        status: "skipped",
        detail: "No retrieval needed for this query",
      });
      console.log("  [2/6] 🌐 Retrieval — skipped (not needed)");
    }

    if (queryPlan.groundingRequirement === "required" && !searchResponse) {
      console.log(
        "  ⚠️ Grounding required but no evidence retrieved. Returning retrieval-failure response.",
      );

      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const textId = `omni-${Date.now()}`;
          writer.write({ type: "text-start", id: textId });
          const directUrlMessage =
            "I could access the page URL, but I couldn’t extract enough rendered body content to reliably summarize what’s explicitly stated on the page.\n\nWhat I tried: direct fetch, a rendered retry, and then I checked whether any meaningful page content was recoverable.\n\nIf you paste the relevant sections (or share a static/docs export), I can summarize/extract them accurately.";
          const genericMessage =
            "I couldn't retrieve enough external evidence for this repo/file analysis task.\n\nI attempted web retrieval, but no usable sources were returned. Please retry, or share specific files (for example `README.md`, `package.json`, `.env.example`, and key docs) so I can produce an accurate grounded output without guessing.";
          writer.write({
            type: "text-delta",
            id: textId,
            delta:
              queryPlan.retrievalStrategy === "direct_url_fetch"
                ? directUrlMessage
                : genericMessage,
          });
          writer.write({ type: "text-end", id: textId });
        },
      });

      return createUIMessageStreamResponse({
        stream,
        headers: {
          "X-Omni-Model": modelId,
          "X-Omni-Provider": providerName,
          "X-Omni-Reason": encodeHeaderValue(reason),
          "X-Omni-Request-Id": requestId,
        },
      });
    }

    if (
      queryPlan.retrievalStrategy === "repo_fetch" &&
      parsedRepoEvidence &&
      isExtractionStyleRepoPrompt(lastContent)
    ) {
      console.log(
        "  ✅ Deterministic repo extraction path selected for extraction-style prompt.",
      );
      const deterministic = formatRepoInspectionReport(parsedRepoEvidence);
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const textId = `omni-${Date.now()}`;
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: deterministic });
          writer.write({ type: "text-end", id: textId });
        },
      });
      return createUIMessageStreamResponse({
        stream,
        headers: {
          "X-Omni-Model": modelId,
          "X-Omni-Provider": providerName,
          "X-Omni-Reason": encodeHeaderValue(reason),
          "X-Omni-Request-Id": requestId,
        },
      });
    }

    // ── Deterministic direct URL extraction for strict prompts ─────────
    if (
      queryPlan.retrievalStrategy === "direct_url_fetch" &&
      parsedDirectUrlEvidence &&
      isDirectUrlExtractionStylePrompt(lastContent)
    ) {
      if (!parsedDirectUrlEvidence.isMeaningful) {
        const limitation = `I could access the page URL, but I couldn’t recover enough page-explicit content to extract reliable headings/sections.\n\nWhat I tried:\n- direct fetch\n- rendered retry (JS-aware)\n\nIf you paste the relevant sections (or export the page as static text), I can extract headings and summarize only what’s explicitly stated.`;
        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            const textId = `omni-${Date.now()}`;
            writer.write({ type: "text-start", id: textId });
            writer.write({ type: "text-delta", id: textId, delta: limitation });
            writer.write({ type: "text-end", id: textId });
          },
        });
        return createUIMessageStreamResponse({
          stream,
          headers: {
            "X-Omni-Model": modelId,
            "X-Omni-Provider": providerName,
            "X-Omni-Reason": encodeHeaderValue(reason),
            "X-Omni-Request-Id": requestId,
          },
        });
      }

      const deterministic = formatDirectUrlPageExtractionReport(
        parsedDirectUrlEvidence,
      );
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const textId = `omni-${Date.now()}`;
          writer.write({ type: "text-start", id: textId });
          writer.write({
            type: "text-delta",
            id: textId,
            delta: deterministic,
          });
          writer.write({ type: "text-end", id: textId });
        },
      });
      return createUIMessageStreamResponse({
        stream,
        headers: {
          "X-Omni-Model": modelId,
          "X-Omni-Provider": providerName,
          "X-Omni-Reason": encodeHeaderValue(reason),
          "X-Omni-Request-Id": requestId,
        },
      });
    }

    const lightweightComparisonPath =
      queryPlan.taskType === "web_research" && isComparisonStyleQuery(lastContent);
    const fastSynthesisPath =
      lightweightComparisonPath || queryPlan.taskType === "web_research";

    if (searchResponse && fastSynthesisPath) {
      searchResponse = {
        ...searchResponse,
        results: enrichWithCredibility(searchResponse.results),
      };
      const before = searchResponse.results.length;
      const capped = capSourcesForSynthesis(searchResponse, 4);
      searchResponse = capped;
      const after = searchResponse.results.length;
      if (after < before) {
        console.log(
          `        ✅ Source cap applied for synthesis: ${before} -> ${after}`,
        );
      }
    }

    if (
      queryPlan.retrievalStrategy === "direct_url_fetch" &&
      isStrictPageSummaryPrompt(lastContent) &&
      parsedDirectUrlEvidence &&
      !parsedDirectUrlEvidence.isMeaningful
    ) {
      console.log(
        "  ⚠️ Direct URL page body not retrievable; returning fast deterministic limitation response.",
      );
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const textId = `omni-${Date.now()}`;
          writer.write({ type: "text-start", id: textId });
          writer.write({
            type: "text-delta",
            id: textId,
            delta:
              "I could access the page URL, but I couldn’t recover enough rendered page content to produce a trustworthy page summary.\n\nWhat I tried:\n- direct fetch\n- rendered retry (JS-aware)\n\nNext step:\n- paste the relevant page sections (or export the page as static text) so I can summarize only what’s explicitly stated.",
          });
          writer.write({ type: "text-end", id: textId });
        },
      });
      return createUIMessageStreamResponse({
        stream,
        headers: {
          "X-Omni-Model": modelId,
          "X-Omni-Provider": providerName,
          "X-Omni-Reason": encodeHeaderValue(reason),
          "X-Omni-Request-Id": requestId,
        },
      });
    }

    // ── Step 3: Deep Analysis ───────────────────────────────────────────
    let analysisText = "";
    if (searchResponse && !lightweightComparisonPath) {
      console.log("  [3/6] 🧠 Running deep analysis...");
      const t3 = Date.now();
      analysisText = deepAnalyze(searchResponse.results);
      const step3Time = Date.now() - t3;
      pipelineSteps.push({
        name: "Deep Analysis",
        status: "done",
        detail: `Extracted facts from ${searchResponse.results.length} sources`,
        durationMs: step3Time,
      });
      console.log(`        ✅ Deep analysis complete (${step3Time}ms)`);
    } else if (searchResponse && lightweightComparisonPath) {
      console.log("  [3/6] 🧠 Deep analysis — lightweight mode");
      const t3 = Date.now();
      analysisText = lightweightResearchSummary(searchResponse.results);
      const step3Time = Date.now() - t3;
      pipelineSteps.push({
        name: "Deep Analysis",
        status: "done",
        detail: "Used lightweight summary path for comparison task",
        durationMs: step3Time,
      });
    } else {
      pipelineSteps.push({ name: "Deep Analysis", status: "skipped" });
      console.log("  [3/6] 🧠 Deep analysis — skipped");
    }

    // ── Step 4: Fact Check ──────────────────────────────────────────────
    let factCheckResult: FactCheckSummary | null = null;
    if (searchResponse && !lightweightComparisonPath) {
      console.log("  [4/6] ✓  Fact-checking across sources...");
      const t4 = Date.now();
      factCheckResult = factCheck(searchResponse.results);
      const step4Time = Date.now() - t4;
      pipelineSteps.push({
        name: "Fact Check",
        status: "done",
        detail: factCheckResult.notes,
        durationMs: step4Time,
      });
      console.log(`        ✅ ${factCheckResult.notes} (${step4Time}ms)`);
    } else if (searchResponse && lightweightComparisonPath) {
      pipelineSteps.push({
        name: "Fact Check",
        status: "skipped",
        detail: "Skipped for lightweight comparison path",
      });
      console.log("  [4/6] ✓  Fact check — skipped (lightweight path)");
    } else {
      pipelineSteps.push({ name: "Fact Check", status: "skipped" });
      console.log("  [4/6] ✓  Fact check — skipped");
    }

    // ── Step 5: Research Synthesis ───────────────────────────────────────
    console.log("  [5/6] 📚 Synthesizing research...");
    const t5 = Date.now();
    const basePrompt = getNexoraSystemPrompt();
    const systemPrompt = buildEnhancedSystemPrompt({
      basePrompt,
      analysis,
      retrievalStrategy: queryPlan.retrievalStrategy,
      webSearchUsed,
      searchResponse,
      analysisText,
      factCheckNotes: factCheckResult?.notes,
      claimVerificationText: factCheckResult
        ? renderClaimChecks(factCheckResult.claimChecks)
        : undefined,
      repoEvidenceBlock,
    });
    const step5Time = Date.now() - t5;
    pipelineSteps.push({
      name: "Research Synthesis",
      status: "done",
      detail: "System prompt enriched with pipeline context",
      durationMs: step5Time,
    });
    console.log(`        ✅ Research synthesized (${step5Time}ms)`);

    // ── Step 6: Generate answer (streaming) ─────────────────────────────
    console.log("  [6/6] 🤖 Generating answer...");
    const totalPipelineMs = Date.now() - t0;
    console.log(`  ⏱  Pipeline pre-processing took ${totalPipelineMs}ms total`);

    const messagesWithSystem: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const generationStartMs = Date.now();
    let firstTokenMs: number | null = null;
    let chosenCandidate = primaryCandidate;

    // Use createUIMessageStream to prepend pipeline tracking, then forward the
    // LLM stream.  We intercept the first `text-start` chunk and inject the
    // tracking block as an initial text-delta so it appears at the top of the
    // assistant message.
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const makeResult = (candidate: RouteCandidate) => {
          const factory =
            candidate.provider === "openrouter" ? openRouterFactory : groqFactory;
          return streamText({
            model: factory(candidate.modelId as Parameters<typeof groq>[0]),
            messages: messagesWithSystem,
          });
        };

        type WriterChunk = Parameters<typeof writer.write>[0];
        const forwardReader = async (
          reader: ReadableStreamDefaultReader<unknown>,
        ) => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = value as WriterChunk;
            if (
              firstTokenMs == null &&
              chunk.type === "text-delta" &&
              typeof chunk.delta === "string" &&
              chunk.delta.length > 0
            ) {
              firstTokenMs = Date.now();
              console.log(
                `        ✅ First token after ${firstTokenMs - generationStartMs}ms (${chosenCandidate.provider}/${chosenCandidate.modelId})`,
              );
            }
            writer.write(chunk);
          }
        };

        const primaryResult = makeResult(primaryCandidate);
        const primaryReader = primaryResult.toUIMessageStream().getReader();
        const bufferedChunks: WriterChunk[] = [];
        let hasFirstDelta = false;

        while (!hasFirstDelta) {
          const race = await Promise.race([
            primaryReader.read(),
            new Promise<null>((resolve) =>
              setTimeout(resolve, DEFAULT_FIRST_TOKEN_TIMEOUT_MS),
            ),
          ]);

          if (race === null) {
            if (fallbackCandidate) {
              console.log(
                `        ⚠️ First-token timeout (${DEFAULT_FIRST_TOKEN_TIMEOUT_MS}ms). Falling back to ${fallbackCandidate.provider}/${fallbackCandidate.modelId}`,
              );
              await primaryReader.cancel("first-token-timeout-fallback");
              chosenCandidate = fallbackCandidate;
              const fallbackReader = makeResult(fallbackCandidate)
                .toUIMessageStream()
                .getReader();
              await forwardReader(fallbackReader);
              const completeMs = Date.now() - generationStartMs;
              updateRouteLatency(
                fallbackCandidate,
                firstTokenMs == null ? completeMs : firstTokenMs - generationStartMs,
                completeMs,
              );
              console.log(`        ✅ Stream complete after ${completeMs}ms`);
              return;
            }
            console.log(
              `        ⚠️ First-token timeout (${DEFAULT_FIRST_TOKEN_TIMEOUT_MS}ms) with no fallback candidate.`,
            );
            continue;
          }

          if (race.done) break;
          const chunk = race.value as WriterChunk;
          bufferedChunks.push(chunk);
          if (
            chunk.type === "text-delta" &&
            typeof chunk.delta === "string" &&
            chunk.delta.length > 0
          ) {
            hasFirstDelta = true;
          }
        }

        for (const chunk of bufferedChunks) writer.write(chunk);
        await forwardReader(primaryReader);
        const completeMs = Date.now() - generationStartMs;
        updateRouteLatency(
          primaryCandidate,
          firstTokenMs == null ? completeMs : firstTokenMs - generationStartMs,
          completeMs,
        );
        console.log(`        ✅ Stream complete after ${completeMs}ms`);
      },
    });

    // Encode pipeline metadata in header for the client-side tracker
    const pipelineHeaderValue = encodeHeaderValue(
      JSON.stringify({
        steps: pipelineSteps,
        totalMs: totalPipelineMs,
        category: analysis.category,
        webSearchUsed,
        retrievalStrategy: queryPlan.retrievalStrategy,
        sourcesCount: searchResponse?.results.length ?? 0,
        imagesCount: 0,
        factCheckVerified: factCheckResult?.verified ?? null,
        provider: providerName,
        modelId,
        fallbackModelId: fallbackCandidate?.modelId ?? null,
        retrievalQuality,
        retrievalQualityNote: retrievalQualityNote ?? null,
        claimChecksTotal: factCheckResult?.claimChecks.length ?? 0,
        claimChecksHighOrMedium:
          factCheckResult?.claimChecks.filter(
            (c) => c.confidence === "high" || c.confidence === "medium",
          ).length ?? 0,
      }),
    );

    console.log("  ✨ Streaming response to client...\n");

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "X-Omni-Model": modelId,
        "X-Omni-Provider": providerName,
        "X-Omni-Reason": encodeHeaderValue(reason),
        "X-Omni-Request-Id": requestId,
        "X-Pipeline-Data": pipelineHeaderValue,
      },
    });
  } catch (err) {
    console.error("[OMNI PIPELINE ERROR]", err);
    return Response.json(
      { error: "AI service temporarily unavailable" },
      { status: 500 },
    );
  }
}
