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
import {
  braveSearch,
  mergeSearchResponses,
  tavilySearch,
  type TavilySearchResponse,
  type TavilyResult,
} from "@/lib/search";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

type OmniProviderName = "groq" | "openrouter";

const OPENROUTER_DEFAULT_MODELS = {
  coding: "openai/gpt-4o-mini",
  heavyReasoning: "anthropic/claude-3.7-sonnet",
  complexWriting: "google/gemini-2.0-flash-001",
  simple: "openai/gpt-4o-mini",
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant" | "system"; content: string };

type IncomingMessage = {
  role?: string;
  content?: string;
  parts?: unknown[];
};

interface QueryAnalysis {
  category: string;
  needsWebSearch: boolean;
  searchQuery: string;
  reasoning: string;
}

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
  model: any,
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

function getOmniProvider(): OmniProviderName {
  return process.env.OMNI_PROVIDER === "openrouter" ? "openrouter" : "groq";
}

function getModelIdForProvider(
  provider: OmniProviderName,
  routeKey: keyof typeof OMNI_MODELS,
): string {
  if (provider === "openrouter") {
    const envMap: Record<keyof typeof OMNI_MODELS, string | undefined> = {
      coding: process.env.OPENROUTER_OMNI_MODEL_CODING,
      heavyReasoning: process.env.OPENROUTER_OMNI_MODEL_HEAVY_REASONING,
      complexWriting: process.env.OPENROUTER_OMNI_MODEL_COMPLEX_WRITING,
      simple: process.env.OPENROUTER_OMNI_MODEL_SIMPLE,
    };
    return envMap[routeKey] || OPENROUTER_DEFAULT_MODELS[routeKey];
  }

  return OMNI_MODELS[routeKey];
}

function createModelFactory(provider: OmniProviderName) {
  if (provider === "openrouter") {
    return getOpenRouter();
  }
  return groq;
}

// ─── Query analysis ─────────────────────────────────────────────────────────

async function analyzeQuery(
  question: string,
  model: any,
): Promise<QueryAnalysis & { recommendedModel: string }> {
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

function buildEnhancedSystemPrompt(
  basePrompt: string,
  analysis: QueryAnalysis,
  searchResponse: TavilySearchResponse | null,
  analysisText: string,
  factCheckResult: FactCheckSummary | null,
): string {
  const parts = [basePrompt];

  parts.push("\n\n--- PIPELINE CONTEXT ---");
  parts.push(`Query Category: ${analysis.category}`);
  parts.push(`Web Search Used: ${analysis.needsWebSearch ? "Yes" : "No"}`);

  if (searchResponse) {
    if (searchResponse.answer) {
      parts.push(`\nSearch Quick Answer: ${searchResponse.answer}`);
    }
    parts.push(`\n${analysisText}`);

    if (factCheckResult) {
      parts.push(`\nFact Check: ${factCheckResult.notes}`);
      parts.push(
        `\nClaim Verification:\n${renderClaimChecks(factCheckResult.claimChecks)}`,
      );
    }
  }

  parts.push(`
Response style guidance:
- Write in a natural, conversational style similar to modern assistants (Gemini/ChatGPT/Groq).
- Do NOT force fixed section headers unless they clearly improve readability.
- When making factual claims from web results, ground them in the available evidence and mention key sources naturally.
- If evidence is weak or conflicting, state uncertainty clearly and avoid overconfident wording.`);

  parts.push("--- END PIPELINE CONTEXT ---");

  return parts.join("\n");
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: IncomingMessage[] };
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = toModelMessages(raw);
    const lastContent = getLastUserContent(raw);
    const pipelineSteps: PipelineStep[] = [];
    const t0 = Date.now();

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║         OMNI AGENT PIPELINE START         ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log(
      `  Prompt: "${lastContent.slice(0, 100)}${lastContent.length > 100 ? "..." : ""}"`,
    );

    const providerName = getOmniProvider();
    const modelFactory = createModelFactory(providerName);
    const simpleModelId = getModelIdForProvider(providerName, "simple");
    const simpleModel = modelFactory(
      simpleModelId as Parameters<typeof groq>[0],
    );

    console.log("  [1/6] 🔍 Analyzing query using AI...");
    const analysis = await analyzeQuery(lastContent, simpleModel);

    // Override the hardcoded router if we have a recommendation from the classifier
    const recommendedKey =
      analysis.recommendedModel in OMNI_MODELS
        ? (analysis.recommendedModel as keyof typeof OMNI_MODELS)
        : "simple";
    const modelId = getModelIdForProvider(providerName, recommendedKey);
    const reason = `AI Classifier: ${analysis.reasoning}`;

    console.log(`        ✅ Category: ${analysis.category}`);
    console.log(`        ✅ Web Search: ${analysis.needsWebSearch}`);
    console.log(
      `        ✅ Routed to: ${analysis.recommendedModel} (${modelId})`,
    );

    const step1Time = Date.now() - t0;
    pipelineSteps.push({
      name: "Query Analysis",
      status: "done",
      detail: analysis.reasoning,
      durationMs: step1Time,
    });

    // ── Step 2: Web Search ──────────────────────────────────────────────
    let searchResponse: TavilySearchResponse | null = null;

    if (analysis.needsWebSearch) {
      console.log("  [2/6] 🌐 Searching the web via Tavily + Brave...");
      const t2 = Date.now();
      try {
        const [tavilyResult, braveResult] = await Promise.allSettled([
          tavilySearch(analysis.searchQuery, {
            maxResults: 5,
            includeImages: false,
          }),
          braveSearch(analysis.searchQuery, {
            maxResults: 5,
            includeImages: false,
          }),
        ]);

        const successfulResponses: TavilySearchResponse[] = [];
        const providerNotes: string[] = [];

        if (tavilyResult.status === "fulfilled") {
          successfulResponses.push(tavilyResult.value);
          providerNotes.push(`Tavily: ${tavilyResult.value.results.length}`);
        } else {
          providerNotes.push("Tavily: failed");
          console.warn("Tavily search failed:", tavilyResult.reason);
        }

        if (braveResult.status === "fulfilled") {
          successfulResponses.push(braveResult.value);
          providerNotes.push(`Brave: ${braveResult.value.results.length}`);
        } else {
          providerNotes.push("Brave: failed");
          console.warn("Brave search failed:", braveResult.reason);
        }

        if (!successfulResponses.length) {
          throw new Error("Both Tavily and Brave search failed");
        }

        searchResponse = mergeSearchResponses(successfulResponses, 8);
        searchResponse.results = enrichWithCredibility(searchResponse.results);
        const step2Time = Date.now() - t2;
        pipelineSteps.push({
          name: "Web Search",
          status: "done",
          detail: `Found ${searchResponse.results.length} merged results (${providerNotes.join(", ")})`,
          durationMs: step2Time,
        });
        console.log(
          `        ✅ ${searchResponse.results.length} merged results (${providerNotes.join(", ")}) (${step2Time}ms)`,
        );
      } catch (err) {
        const step2Time = Date.now() - t2;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        pipelineSteps.push({
          name: "Web Search",
          status: "error",
          detail: errMsg,
          durationMs: step2Time,
        });
        console.log(`        ❌ Search failed: ${errMsg} (${step2Time}ms)`);
      }
    } else {
      pipelineSteps.push({
        name: "Web Search",
        status: "skipped",
        detail: "Not needed for this query",
      });
      console.log("  [2/6] 🌐 Web search — skipped (not needed)");
    }

    // ── Step 3: Deep Analysis ───────────────────────────────────────────
    let analysisText = "";
    if (searchResponse) {
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
    } else {
      pipelineSteps.push({ name: "Deep Analysis", status: "skipped" });
      console.log("  [3/6] 🧠 Deep analysis — skipped");
    }

    // ── Step 4: Fact Check ──────────────────────────────────────────────
    let factCheckResult: FactCheckSummary | null = null;
    if (searchResponse) {
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
    } else {
      pipelineSteps.push({ name: "Fact Check", status: "skipped" });
      console.log("  [4/6] ✓  Fact check — skipped");
    }

    // ── Step 5: Research Synthesis ───────────────────────────────────────
    console.log("  [5/6] 📚 Synthesizing research...");
    const t5 = Date.now();
    const basePrompt = getNexoraSystemPrompt();
    const systemPrompt = buildEnhancedSystemPrompt(
      basePrompt,
      analysis,
      searchResponse,
      analysisText,
      factCheckResult,
    );
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

    // Build pipeline tracking text that will appear at the top of the response
    const trackingLines: string[] = [];
    for (const step of pipelineSteps) {
      const icon =
        step.status === "done" ? "✅" : step.status === "error" ? "❌" : "⏭️";
      const time = step.durationMs != null ? ` *(${step.durationMs}ms)*` : "";
      const detail = step.detail ? ` — ${step.detail}` : "";
      trackingLines.push(`> ${icon} **${step.name}**${detail}${time}`);
    }
    trackingLines.push(
      `> 🤖 **Generating Answer** — Streaming from ${modelId.split("/").pop()}...`,
    );
    const trackingBlock = trackingLines.join("\n") + "\n\n---\n\n";

    const messagesWithSystem: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const result = streamText({
      model: modelFactory(modelId as Parameters<typeof groq>[0]),
      messages: messagesWithSystem,
    });

    // Use createUIMessageStream to prepend pipeline tracking, then forward the
    // LLM stream.  We intercept the first `text-start` chunk and inject the
    // tracking block as an initial text-delta so it appears at the top of the
    // assistant message.
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const llmStream = result.toUIMessageStream();
        const reader = llmStream.getReader();

        let textStartChunk: any | null = null;
        let textEndChunk: any | null = null;
        let rawModelText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chunk = value as any;

          if (chunk.type === "text-start") {
            textStartChunk = chunk;
            continue;
          }

          if (chunk.type === "text-delta") {
            rawModelText += chunk.delta ?? "";
            continue;
          }

          if (chunk.type === "text-end") {
            textEndChunk = chunk;
            continue;
          }

          writer.write(chunk);
        }

        const simplePostProcessModelId = getModelIdForProvider(
          providerName,
          "simple",
        );
        const processedTextBase = postProcessResponse(
          rawModelText,
          lastContent,
        );
        const processedText = await maybeRefineWithLightweightAI(
          processedTextBase,
          lastContent,
          modelFactory(simplePostProcessModelId as Parameters<typeof groq>[0]),
        );

        const textId = textStartChunk?.id ?? `omni-${Date.now()}`;
        writer.write(
          textStartChunk ?? {
            type: "text-start",
            id: textId,
          },
        );
        writer.write({
          type: "text-delta",
          id: textId,
          delta: `${trackingBlock}${processedText}`,
        });
        writer.write(
          textEndChunk ?? {
            type: "text-end",
            id: textId,
          },
        );
      },
    });

    // Encode pipeline metadata in header for the client-side tracker
    const pipelineHeaderValue = encodeHeaderValue(
      JSON.stringify({
        steps: pipelineSteps,
        totalMs: totalPipelineMs,
        category: analysis.category,
        webSearchUsed: analysis.needsWebSearch,
        sourcesCount: searchResponse?.results.length ?? 0,
        imagesCount: 0,
        factCheckVerified: factCheckResult?.verified ?? null,
        provider: providerName,
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
