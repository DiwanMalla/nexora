/**
 * POST /api/chat — Chat completion endpoint.
 *
 * Single-model: optional `webSearch` tool loop; **current-fact** detection forces
 * a real webSearch call (prepareStep) + guard if no tool ran.
 *
 * Consensus (2+ models): only when `AI_CHAT_CONSENSUS_ENABLED` is true in
 * `src/lib/constants.ts` (currently off).
 */

import { generateText, stepCountIs, tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { tavilySearch } from "@/lib/search";
import { getModelNameByApiId } from "@/lib/ai-providers";
import { getOpenRouter } from "@/lib/ai/providers";
import { AI_CHAT_CONSENSUS_ENABLED, AVAILABLE_MODELS } from "@/lib/constants";
import {
  CURRENT_FACT_SYSTEM_RULES,
  currentFactToolFailureUserMessage,
  detectCurrentFactIntent,
  NO_FAKE_VERIFICATION_LANGUAGE,
  stripFalseVerificationClaimsWhenNoTools,
  toolOrFunctionFailureUserMessage,
} from "@/lib/chat/current-fact";
import {
  buildAdaptiveResponseStyleSystemBlock,
  classifyChatResponseStyleIntent,
} from "@/lib/chat/response-style-hints";
import { sanitizeLiveWebSearchQuery } from "@/lib/chat/web-search-query";
import { plainTextFromChatContent } from "@/lib/chat/message-content";
import { inferChatPresentationHints } from "@/lib/chat/chat-presentation-hints";
import { buildConversationTitleFromPrompt } from "@/lib/chat/conversation-title";
import { maybeGenerateConversationTitle } from "@/lib/chat/title-generator";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getAiChatSystemPromptWithModel,
  getNexoraSystemPrompt,
} from "@/lib/nexora-system-prompt";
import type { ChatAPIResponse, ChatResponseMeta } from "@/types";

export const runtime = "edge";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const DEFAULT_MODEL = "openai/gpt-4o-mini";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

type ModelProvider = "Groq" | "OpenRouter";

function getProviderForModelId(modelId: string): ModelProvider {
  const def = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (def?.provider === "OpenRouter") return "OpenRouter";
  return "Groq";
}

const WEB_SEARCH_SYSTEM_SUFFIX = `

You have a tool named **webSearch** (Tavily) for live web facts. Call it when the user needs current events, recent news, time-sensitive facts, or verification against up-to-date sources.
**Search queries:** keep them short and natural (e.g. \`latest news in Nepal\`, \`Nepal political situation\`, \`Nepal economy latest\`). For rolling “what’s happening now” questions, **do not** put **past calendar years** in the query string unless the user explicitly asked about that year — the index is already time-aware.
After results return: lead with the direct answer, then structure the rest as fits (bullets, short sections). Include **real markdown links** from the results **toward the end**—heading names are flexible. Prefer readable structure over one dense block when the answer is non-trivial.${NO_FAKE_VERIFICATION_LANGUAGE}`;

async function ensureProfileExists(userId: string): Promise<void> {
  try {
    const serviceClient = createServiceRoleClient();
    await serviceClient.from("profiles").upsert(
      { id: userId },
      { onConflict: "id", ignoreDuplicates: false },
    );
  } catch (error: unknown) {
    console.warn(
      "[Nexora /api/chat] profile bootstrap failed",
      error instanceof Error ? error.message : error,
    );
  }
}

async function getOrCreateConversation(params: {
  userId: string;
  conversationId?: string;
  modelId: string;
  agentType?: string;
  initialTitle: string;
}) {
  const { userId, conversationId, modelId, agentType, initialTitle } = params;
  const supabase = await createClerkSupabaseClient();
  if (conversationId) {
    const existing = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing.data?.id) {
      return { supabase, conversationId: existing.data.id, created: false };
    }

    const created = await supabase
      .from("conversations")
      .insert({
        id: conversationId,
        user_id: userId,
        title: initialTitle,
        model: modelId,
        agent_type: agentType ?? null,
      })
      .select("id")
      .single();
    return {
      supabase,
      conversationId: created.data?.id ?? null,
      created: true,
    };
  }

  const created = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: initialTitle,
      model: modelId,
      agent_type: agentType ?? null,
    })
    .select("id")
    .single();
  return { supabase, conversationId: created.data?.id ?? null, created: true };
}

function resolveWebSearchQueriesForMeta(
  useWebSearchToolLoop: boolean,
  executedSanitized: string[],
  steps: Array<{
    toolCalls: Array<{ toolName: string; input?: unknown }>;
  }>,
): string[] {
  if (!useWebSearchToolLoop) return [];
  if (executedSanitized.length > 0) return [...executedSanitized];
  return collectWebSearchQueriesFromSteps(steps);
}

/** Collect webSearch tool queries from all generation steps (AI SDK multi-step). */
function collectWebSearchQueriesFromSteps(
  steps: Array<{
    toolCalls: Array<{ toolName: string; input?: unknown }>;
  }>,
): string[] {
  const queries: string[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls) {
      if (call.toolName !== "webSearch") continue;
      const input = call.input;
      if (
        input &&
        typeof input === "object" &&
        input !== null &&
        "query" in input
      ) {
        queries.push(String((input as { query: string }).query));
      }
    }
  }
  return queries;
}

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
        const provider = getProviderForModelId(modelId);
        const model =
          provider === "OpenRouter"
            ? getOpenRouter()(modelId as Parameters<typeof groq>[0])
            : groq(modelId);

        const r = await generateText({
          model,
          messages: typedMessages,
        });
        const name = getModelNameByApiId(modelId) ?? modelId;
        console.log(
          `[Nexora /api/chat] consensus leg responded: ${getProviderForModelId(modelId)}/${modelId} (${name}), chars=${r.text.trim().length}`,
        );
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

  const consensusBaseModelId = valid[0]?.modelId ?? enabledModelIds[0]!;
  const consensusBaseProvider = getProviderForModelId(consensusBaseModelId);
  const consensusModel =
    consensusBaseProvider === "OpenRouter"
      ? getOpenRouter()(consensusBaseModelId as Parameters<typeof groq>[0])
      : groq(consensusBaseModelId);

  const consensus = await generateText({
    model: consensusModel,
    messages: [{ role: "user" as const, content: consensusPrompt }],
  });

  const synthName =
    getModelNameByApiId(consensusBaseModelId) ?? consensusBaseModelId;
  console.log(
    `[Nexora /api/chat] consensus synthesis: ${getProviderForModelId(consensusBaseModelId)}/${consensusBaseModelId} (${synthName})`,
  );

  return consensus.text.trim() || valid[0].text;
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: {
    messages?: { role: string; content: string }[];
    model?: string;
    enabledModels?: string[];
    webSearch?: boolean;
    conversationId?: string;
    agentType?: string;
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
  const webSearchEnabled = body.webSearch !== false;
  const requestedConversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : undefined;
  const agentType =
    typeof body.agentType === "string" && body.agentType.trim()
      ? body.agentType.trim()
      : undefined;
  let enabledModels = Array.isArray(body.enabledModels)
    ? body.enabledModels.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  if (!AI_CHAT_CONSENSUS_ENABLED && enabledModels.length > 1) {
    console.log(
      "[Nexora /api/chat] consensus disabled (AI_CHAT_CONSENSUS_ENABLED=false); using single model from request body",
    );
    enabledModels = [];
  }

  // ─── Consensus mode (2+ models) ──────────────────────

  if (enabledModels.length > 1) {
    try {
      const text = await runCompetingConsensus(messages, enabledModels);
      const modelLabel = enabledModels
        .map((id) => getModelNameByApiId(id) ?? id)
        .join(", ");

      const meta: ChatResponseMeta = {
        mode: "consensus",
        consensusModelIds: enabledModels,
        displayName: modelLabel,
        // Consensus path does not invoke Tavily today (toggle applies to single-model only).
        webSearchEnabled: false,
      };
      console.log(
        "[Nexora /api/chat] response ready (consensus)",
        JSON.stringify(meta),
      );

      return NextResponse.json(
        { text, model: modelLabel, meta } satisfies ChatAPIResponse,
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
  const modelProvider = getProviderForModelId(modelId);
  const languageModel =
    modelProvider === "OpenRouter"
      ? getOpenRouter()(modelId as Parameters<typeof groq>[0])
      : groq(modelId);
  const authState = await auth();
  const userId = authState.userId;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ChatAPIResponse,
      { status: 401 },
    );
  }

  const lastUserContent = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const lastUserText = plainTextFromChatContent(lastUserContent)
    .replace(/^\uFEFF/, "")
    .trim();
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const assistantMessageCount = messages.filter(
    (m) => m.role === "assistant",
  ).length;
  const isFirstConversationTurn =
    userMessageCount === 1 && assistantMessageCount === 0;
  let initialConversationTitle = buildConversationTitleFromPrompt(lastUserText);
  if (lastUserText && isFirstConversationTurn) {
    const aiTitle = await maybeGenerateConversationTitle({
      model: languageModel,
      firstUserMessage: lastUserText,
    });
    if (aiTitle) initialConversationTitle = aiTitle;
  }

  const factIntent = detectCurrentFactIntent(lastUserText);
  const effectiveWebSearch = webSearchEnabled || factIntent.currentFact;
  const presentation = inferChatPresentationHints(lastUserText);
  const responseStyleIntent = classifyChatResponseStyleIntent(
    lastUserText,
    factIntent,
  );

  let systemPrompt = getAiChatSystemPromptWithModel(modelDisplayName);
  if (presentation.systemAddendum) {
    systemPrompt += presentation.systemAddendum;
  }

  if (factIntent.currentFact) {
    systemPrompt += CURRENT_FACT_SYSTEM_RULES;
  } else if (effectiveWebSearch) {
    systemPrompt += WEB_SEARCH_SYSTEM_SUFFIX;
  }

  systemPrompt += buildAdaptiveResponseStyleSystemBlock(responseStyleIntent);

  const useWebSearchToolLoop = effectiveWebSearch;

  const normalizedTurnMessages: ChatMsg[] = (
    messages as Array<{ role: string; content: unknown }>
  )
    .map((m) => ({
      role: m.role as ChatMsg["role"],
      content: plainTextFromChatContent(m.content),
    }))
    .filter(
      (m): m is ChatMsg =>
        m.role === "user" ||
        m.role === "assistant" ||
        m.role === "system",
    );

  const messagesWithIdentity: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    ...normalizedTurnMessages,
  ];

  let persistenceConversationId: string | null = null;
  let persistenceClient: Awaited<ReturnType<typeof createClerkSupabaseClient>> | null =
    null;
  try {
    await ensureProfileExists(userId);
    const conversationInit = await getOrCreateConversation({
      userId,
      conversationId: requestedConversationId,
      modelId,
      agentType,
      initialTitle: initialConversationTitle,
    });
    persistenceClient = conversationInit.supabase;
    persistenceConversationId = conversationInit.conversationId;
    if (persistenceClient && persistenceConversationId && lastUserText) {
      await persistenceClient.from("messages").insert({
        conversation_id: persistenceConversationId,
        user_id: userId,
        role: "user",
        content: lastUserText,
      });
    }
  } catch (error: unknown) {
    console.warn(
      "[Nexora /api/chat] non-blocking persistence init failed",
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const executedWebSearchQueries: string[] = [];

    const webSearchTool = tool({
      description:
        "Search the live web (Tavily). Use short, natural queries. For current or rolling news, do not add past calendar years unless the user asked about that year — prefer e.g. 'latest news in Nepal', 'Nepal economy latest'. Required when the system marks the question as time-sensitive.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Natural web search string, not keyword soup. For live news: undated phrases preferred (e.g. 'latest news in Nepal', 'what is happening in Nepal right now'); avoid past years unless the user anchored that year.",
          ),
      }),
      execute: async ({ query }: { query: string }) => {
        const sanitized = sanitizeLiveWebSearchQuery({
          query,
          userText: lastUserText,
          factIntent,
        });
        if (sanitized !== query.trim()) {
          console.log(
            `[Nexora /api/chat] webSearch query sanitized: raw=${JSON.stringify(query)} -> ${JSON.stringify(sanitized)} model=${modelId}`,
          );
        } else {
          console.log(
            `[Nexora /api/chat] webSearch (Tavily) query=${JSON.stringify(sanitized)} model=${modelId}`,
          );
        }
        executedWebSearchQueries.push(sanitized);
        try {
          const searchResult = await tavilySearch(sanitized);
          return searchResult as unknown as Record<string, unknown>;
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Search failed.";
          return { error: message };
        }
      },
    });

    const toolLoopArgs = {
      tools: { webSearch: webSearchTool },
      stopWhen: stepCountIs(12),
      ...(factIntent.currentFact
        ? {
            prepareStep: ({ stepNumber }: { stepNumber: number }) => {
              if (stepNumber === 0) {
                return {
                  toolChoice: {
                    type: "tool" as const,
                    toolName: "webSearch" as const,
                  },
                };
              }
              return {};
            },
          }
        : {}),
    };

    const runGenerate = () => {
      executedWebSearchQueries.length = 0;
      return generateText({
        model: languageModel,
        messages: messagesWithIdentity,
        ...(useWebSearchToolLoop ? toolLoopArgs : {}),
      });
    };

    const runGenerateOnce = async () => {
      try {
        return { ok: true as const, result: await runGenerate() };
      } catch (error: unknown) {
        return { ok: false as const, error };
      }
    };

    const firstPass = await runGenerateOnce();
    if (!firstPass.ok) {
      const err = firstPass.error;
      console.error(
        "[Nexora /api/chat] generateText / tool loop failed (first pass)",
        err instanceof Error ? err.stack ?? err.message : err,
      );
      const meta: ChatResponseMeta = {
        mode: "single",
        provider: modelProvider,
        modelId,
        displayName: modelDisplayName,
        webSearchEnabled: effectiveWebSearch,
        webSearchCalls: 0,
        stepCount: 0,
        currentFactIntent: factIntent.currentFact,
        currentFactReason: factIntent.reason,
        currentFactGuardTriggered: false,
        chatGenerationDegraded: true,
        responseStyleIntent,
      };
      return NextResponse.json(
        {
          text: toolOrFunctionFailureUserMessage(),
          model: modelDisplayName,
          meta,
        } satisfies ChatAPIResponse,
        { status: 200 },
      );
    }

    let result = firstPass.result;
    let webQueries = resolveWebSearchQueriesForMeta(
      useWebSearchToolLoop,
      executedWebSearchQueries,
      result.steps,
    );

    if (factIntent.currentFact && webQueries.length === 0) {
      console.warn(
        "[Nexora /api/chat] current-fact: zero webSearch calls after first pass; retrying once",
      );
      const secondPass = await runGenerateOnce();
      if (!secondPass.ok) {
        const err = secondPass.error;
        console.error(
          "[Nexora /api/chat] generateText / tool loop failed (current-fact retry)",
          err instanceof Error ? err.stack ?? err.message : err,
        );
        const meta: ChatResponseMeta = {
          mode: "single",
          provider: modelProvider,
          modelId,
          displayName: modelDisplayName,
          webSearchEnabled: effectiveWebSearch,
          webSearchCalls: 0,
          stepCount: 0,
          currentFactIntent: factIntent.currentFact,
          currentFactReason: factIntent.reason,
          currentFactGuardTriggered: true,
          chatGenerationDegraded: true,
          responseStyleIntent,
        };
        return NextResponse.json(
          {
            text: currentFactToolFailureUserMessage(
              "current office-holder / live fact",
            ),
            model: modelDisplayName,
            meta,
          } satisfies ChatAPIResponse,
          { status: 200 },
        );
      }
      result = secondPass.result;
      webQueries = resolveWebSearchQueriesForMeta(
        useWebSearchToolLoop,
        executedWebSearchQueries,
        result.steps,
      );
    }

    const guardTriggered =
      factIntent.currentFact && webQueries.length === 0;
    let responseText = result.text.trim();
    if (guardTriggered) {
      console.warn(
        "[Nexora /api/chat] current-fact guard: no webSearch tool executed; returning safe limitation message",
      );
      responseText = currentFactToolFailureUserMessage(
        "current office-holder / live fact",
      );
    } else if (effectiveWebSearch && webQueries.length === 0) {
      responseText = stripFalseVerificationClaimsWhenNoTools(responseText);
    }

    const meta: ChatResponseMeta = {
      mode: "single",
      provider: modelProvider,
      modelId,
      displayName: modelDisplayName,
      webSearchEnabled: effectiveWebSearch,
      webSearchCalls: webQueries.length,
      webSearchQueries: webQueries.length > 0 ? webQueries : undefined,
      stepCount: result.steps.length,
      currentFactIntent: factIntent.currentFact,
      currentFactReason: factIntent.reason,
      currentFactGuardTriggered: guardTriggered,
      responseStyleIntent,
    };

    console.log(
      `[Nexora /api/chat] response ready: ${modelProvider}/${modelId} (${modelDisplayName}) effectiveWebSearch=${effectiveWebSearch} currentFact=${factIntent.currentFact} reason=${factIntent.reason ?? "n/a"} style=${responseStyleIntent} toolCalls=${webQueries.length} steps=${result.steps.length} guard=${guardTriggered} lastUserLen=${lastUserText.length}`,
    );

    if (persistenceClient && persistenceConversationId) {
      try {
        await persistenceClient.from("messages").insert({
          conversation_id: persistenceConversationId,
          user_id: userId,
          role: "assistant",
          content: responseText,
          model: modelId,
          metadata: {
            provider: modelProvider,
            webSearchCalls: webQueries.length,
            currentFactIntent: factIntent.currentFact,
            currentFactReason: factIntent.reason ?? null,
            responseStyleIntent,
            stepCount: result.steps.length,
          },
          citations:
            webQueries.length > 0
              ? webQueries.map((q) => ({ query: q }))
              : null,
        });
        await persistenceClient
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            model: modelId,
            agent_type: agentType ?? null,
          })
          .eq("id", persistenceConversationId)
          .eq("user_id", userId);

      } catch (error: unknown) {
        console.warn(
          "[Nexora /api/chat] non-blocking assistant persistence failed",
          error instanceof Error ? error.message : error,
        );
      }
    }

    return NextResponse.json(
      {
        text: responseText,
        model: modelDisplayName,
        meta,
      } satisfies ChatAPIResponse,
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
