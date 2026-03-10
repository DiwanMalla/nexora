/**
 * POST /api/omni-agent — OmniAgent streaming endpoint.
 *
 * Implements a full intelligence pipeline:
 *   1. Query Analysis   — classify intent, decide if web search is needed
 *   2. Web Search       — Tavily search with images (when needed)
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
  generateObject,
} from "ai";
import { z } from "zod";
import { createGroq } from "@ai-sdk/groq";
import { OMNI_MODELS } from "@/lib/omni-router";
import { getNexoraSystemPrompt } from "@/lib/nexora-system-prompt";
import {
  tavilySearch,
  type TavilySearchResponse,
  type TavilyResult,
} from "@/lib/tavily";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

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

// ─── Query analysis ─────────────────────────────────────────────────────────

async function analyzeQuery(
  question: string,
  model: any,
): Promise<QueryAnalysis & { recommendedModel: string }> {
  try {
    const { object } = await generateObject({
      model,
      schema: z.object({
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
      }),
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
      - "simple": for everything else.`,
      prompt: `User Message: "${question}"`,
    });

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
    "## Sources",
    sources.join("\n"),
  ].join("\n");
}

function factCheck(results: TavilyResult[]): {
  verified: boolean;
  notes: string;
} {
  if (results.length < 2) {
    return {
      verified: false,
      notes: "Only one source available — limited cross-referencing.",
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
  const notes = verified
    ? `Cross-referenced ${results.length} sources with ${agreementCount} agreement(s).`
    : `${results.length} sources checked — limited agreement found; treat with caution.`;

  return { verified, notes };
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
  factCheckResult: { verified: boolean; notes: string } | null,
): string {
  const parts = [basePrompt];

  parts.push("\n\n--- PIPELINE CONTEXT ---");
  parts.push(`Query Category: ${analysis.category}`);
  parts.push(`Web Search Used: ${analysis.needsWebSearch ? "Yes" : "No"}`);

  if (searchResponse) {
    if (searchResponse.answer) {
      parts.push(`\nTavily Quick Answer: ${searchResponse.answer}`);
    }
    parts.push(`\n${analysisText}`);

    if (factCheckResult) {
      parts.push(`\nFact Check: ${factCheckResult.notes}`);
    }
  }

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

    const simpleModel = groq(OMNI_MODELS.simple as Parameters<typeof groq>[0]);

    console.log("  [1/6] 🔍 Analyzing query using AI...");
    const analysis = await analyzeQuery(lastContent, simpleModel);

    // Override the hardcoded router if we have a recommendation from the classifier
    const modelId =
      (OMNI_MODELS as any)[analysis.recommendedModel] || OMNI_MODELS.simple;
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
      console.log("  [2/6] 🌐 Searching the web via Tavily...");
      const t2 = Date.now();
      try {
        searchResponse = await tavilySearch(analysis.searchQuery, {
          maxResults: 5,
          includeImages: false,
        });
        const step2Time = Date.now() - t2;
        pipelineSteps.push({
          name: "Web Search",
          status: "done",
          detail: `Found ${searchResponse.results.length} results`,
          durationMs: step2Time,
        });
        console.log(
          `        ✅ ${searchResponse.results.length} results (${step2Time}ms)`,
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
    let factCheckResult: { verified: boolean; notes: string } | null = null;
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
      model: groq(modelId as Parameters<typeof groq>[0]),
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

        let injectedTracking = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chunk = value as any;

          if (!injectedTracking && chunk.type === "text-start") {
            writer.write(chunk);
            writer.write({
              type: "text-delta",
              id: chunk.id,
              delta: trackingBlock,
            } as typeof chunk);
            injectedTracking = true;
            continue;
          }

          writer.write(chunk);
        }
      },
    });

    // Encode pipeline metadata in header for the client-side tracker
    const pipelineHeaderValue = JSON.stringify({
      steps: pipelineSteps,
      totalMs: totalPipelineMs,
      category: analysis.category,
      webSearchUsed: analysis.needsWebSearch,
      sourcesCount: searchResponse?.results.length ?? 0,
      imagesCount: 0,
      factCheckVerified: factCheckResult?.verified ?? null,
    });

    console.log("  ✨ Streaming response to client...\n");

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "X-Omni-Model": modelId,
        "X-Omni-Reason": reason,
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
