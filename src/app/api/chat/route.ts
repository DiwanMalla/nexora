/**
 * POST /api/chat — Chat completion endpoint.
 *
 * Supports two modes:
 *   1. **Single model**: Uses `model` field, returns direct response.
 *   2. **Consensus mode**: When `enabledModels` has 2+ IDs, runs all in
 *      parallel and synthesizes one agreed response.
 *
 * Includes Tavily web search as a tool for factual queries.
 */

import { generateText, tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";
import { z } from "zod";
import { tavilySearch } from "@/lib/tavily";
import { getModelNameByApiId } from "@/lib/ai-providers";
import {
  getNexoraSystemPrompt,
  getNexoraSystemPromptWithModel,
} from "@/lib/nexora-system-prompt";
import type { ChatAPIResponse } from "@/types";

export const runtime = "edge";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

// ─── Consensus Logic ──────────────────────────────────────────────

/**
 * Runs multiple models in parallel, then synthesizes one consensus response.
 * Keeps latency ~max(models) + one fast synthesis call.
 */
async function runCompetingConsensus(
  messages: { role: string; content: string }[],
  enabledModelIds: string[],
): Promise<string> {
  const lastUser = messages.filter((m) => m.role === "user").pop();
  const userContent = lastUser?.content ?? "";

  const systemMsg: ChatMsg = {
    role: "system",
    content: `${getNexoraSystemPrompt()}\n\nMultiple models are used to combine the best answer. When asked who or what you are, say you're Nexora.`,
  };
  const typedMessages: ChatMsg[] = [systemMsg, ...(messages as ChatMsg[])];

  const results = await Promise.all(
    enabledModelIds.map(async (modelId) => {
      try {
        const r = await generateText({
          model: groq(modelId),
          messages: typedMessages,
        });
        return { modelId, text: r.text.trim() };
      } catch {
        return { modelId, text: "" };
      }
    }),
  );

  const valid = results.filter((r) => r.text.length > 0);
  if (valid.length === 0)
    return "I couldn't generate a response from any model.";
  if (valid.length === 1) return valid[0].text;

  const consensusPrompt = `You are a moderator. The user asked:

"${userContent}"

The following AI models each gave a response. Produce a single response that best answers the user and that all models would agree with. Be concise and accurate. Output only the final agreed answer, no meta-commentary.

Model responses:
${valid.map((r, i) => `--- Model ${i + 1} ---\n${r.text}`).join("\n\n")}

Agreed response:`;

  const consensus = await generateText({
    model: groq(enabledModelIds[0]),
    messages: [{ role: "user" as const, content: consensusPrompt }],
  });

  return consensus.text.trim() || valid[0].text;
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: {
    messages?: { role: string; content: string }[];
    model?: string;
    enabledModels?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." } satisfies ChatAPIResponse,
      { status: 400 },
    );
  }

  const messages = body.messages ?? [];
  const model = body.model || DEFAULT_MODEL;
  const enabledModels = Array.isArray(body.enabledModels)
    ? body.enabledModels.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  // ─── Consensus mode (2+ models) ──────────────────────

  if (enabledModels.length > 1) {
    try {
      const text = await runCompetingConsensus(messages, enabledModels);
      const modelLabel = enabledModels
        .map((id) => getModelNameByApiId(id) ?? id)
        .join(", ");

      return NextResponse.json(
        { text, model: modelLabel } satisfies ChatAPIResponse,
        { status: 200 },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Consensus request failed.";
      return NextResponse.json(
        {
          error: "Unable to generate chat response.",
          details: message,
        } satisfies ChatAPIResponse,
        { status: 500 },
      );
    }
  }

  // ─── Single model mode ───────────────────────────────

  const modelId = enabledModels.length === 1 ? enabledModels[0] : model;
  const modelDisplayName = getModelNameByApiId(modelId) ?? modelId;

  const systemPrompt = getNexoraSystemPromptWithModel(modelDisplayName);

  const messagesWithIdentity: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    ...(messages as ChatMsg[]),
  ];

  try {
    const result = await generateText({
      model: groq(modelId),
      messages: messagesWithIdentity,
      tools: {
        webSearch: tool({
          description:
            "Search the web for up-to-date information, facts, news, and history.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
              const result = await tavilySearch(query);
              return result as unknown as Record<string, unknown>;
            } catch (err: unknown) {
              const message =
                err instanceof Error ? err.message : "Search failed.";
              return { error: message };
            }
          },
        }),
      },
    });

    return NextResponse.json(
      { text: result.text, model: modelDisplayName } satisfies ChatAPIResponse,
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to generate chat response.";
    return NextResponse.json(
      {
        error: "Unable to generate chat response.",
        details: message,
      } satisfies ChatAPIResponse,
      { status: 500 },
    );
  }
}
