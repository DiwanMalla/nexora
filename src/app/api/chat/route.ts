/**
 * POST /api/chat — Chat completion endpoint.
 *
 * Single-model: optional `webSearch` tool loop; **current-fact** and **live-news**
 * intents force a real webSearch call (prepareStep) + guard if no tool ran.
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
import type { SearchResponse } from "@/lib/search/types";
import { getModelNameByApiId } from "@/lib/ai-providers";
import { getOpenRouter } from "@/lib/ai/providers";
import { AI_CHAT_CONSENSUS_ENABLED, AVAILABLE_MODELS } from "@/lib/constants";
import {
  CURRENT_FACT_SYSTEM_RULES,
  CURRENT_NEWS_GROUNDED_SYSTEM_RULES,
  currentFactToolFailureUserMessage,
  detectCurrentFactIntent,
  liveNewsToolFailureUserMessage,
  NO_FAKE_VERIFICATION_LANGUAGE,
  stripFalseVerificationClaimsWhenNoTools,
  toolOrFunctionFailureUserMessage,
} from "@/lib/chat/current-fact";
import {
  buildAdaptiveResponseStyleSystemBlock,
  classifyChatResponseStyleIntent,
} from "@/lib/chat/response-style-hints";
import {
  buildLiveNewsPrefetchQueries,
  buildSourceDiversityGuidance,
  clusterLiveNewsResults,
  dominantDomainShare,
  formatClustersForSystemPrompt,
  filterLiveNewsSearchResponse,
  getLiveNewsRankingMode,
  mergeLiveNewsPrefetchResponses,
  rankClustersBySignificance,
  parseLiveNewsStructuredPayload,
  stripLiveNewsJsonFromText,
  type LiveNewsProgressStage,
} from "@/lib/chat/live-news-pipeline";
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
import {
  attachmentContextForPrompt,
  linkAttachmentsToUserMessage,
  loadReadyAttachmentsForUser,
  normalizeAttachmentIds,
} from "@/lib/attachments/db";

export const runtime = "nodejs";

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

/**
 * Some models are inconsistent with AI SDK tool-loop execution for forced
 * live-news grounding. Keep them out of grounded mode until verified.
 */
function supportsGroundedLiveNewsToolFlow(modelId: string): boolean {
  const unsupported = new Set([
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-safeguard-20b",
  ]);
  return !unsupported.has(modelId);
}

function previewForLog(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}...`;
}

function hasPipeTableSignal(text: string): boolean {
  return /\|/.test(text) && (/\n\|/.test(text) || /\|\s*---/.test(text));
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
      .select("id,title")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing.data?.id) {
      const currentTitle = existing.data.title?.trim().toLowerCase() ?? "";
      if (
        currentTitle === "new conversation" ||
        currentTitle === "untitled conversation" ||
        currentTitle === "new chat"
      ) {
        await supabase
          .from("conversations")
          .update({
            title: initialTitle,
            model: modelId,
            agent_type: agentType ?? null,
          })
          .eq("id", existing.data.id)
          .eq("user_id", userId);
      }
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
    attachmentIds?: string[];
    stream?: boolean;
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
  const requestId = crypto.randomUUID();
  const requestStartedAt = Date.now();
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

  const attachmentIds = normalizeAttachmentIds(body.attachmentIds);

  // ─── Consensus mode (2+ models) ──────────────────────

  if (enabledModels.length > 1) {
    if (attachmentIds.length > 0) {
      return NextResponse.json(
        {
          error: "Attachments are not supported in multi-model consensus mode.",
        } satisfies ChatAPIResponse,
        { status: 400 },
      );
    }
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
  const logLifecycle = (stage: string, details?: Record<string, unknown>) => {
    console.log("[Nexora /api/chat] lifecycle", {
      requestId,
      stage,
      modelId,
      modelDisplayName,
      modelProvider,
      ...(details ?? {}),
    });
  };
  logLifecycle("request_received", {
    streamRequested: body.stream === true,
    webSearchEnabled,
    messageCount: messages.length,
    enabledModelsCount: enabledModels.length,
  });
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

  if (attachmentIds.length > 0) {
    console.log("[Nexora /api/chat] incoming attachments", {
      userId,
      requestedConversationId: requestedConversationId ?? null,
      attachmentIds,
    });
  }

  const serviceSb = createServiceRoleClient();
  const attachmentItems = await loadReadyAttachmentsForUser(
    serviceSb,
    userId,
    attachmentIds,
  );

  if (attachmentIds.length > 0 && attachmentItems.length === 0) {
    const { data: diagRows, error: diagErr } = await serviceSb
      .from("attachments")
      .select("id,status,user_id,extracted_text")
      .in("id", attachmentIds);

    let failureCode =
      "ATTACHMENT_NOT_LOADABLE" as
        | "ATTACHMENT_NOT_LOADABLE"
        | "NO_ROWS"
        | "WRONG_USER"
        | "NOT_READY"
        | "EMPTY_EXTRACTED_TEXT";

    if (diagErr) {
      console.warn("[Nexora /api/chat] attachment diagnostic query error", {
        message: diagErr.message,
        userId,
        requestedConversationId,
        attachmentIds,
      });
    } else if (!diagRows?.length) {
      failureCode = "NO_ROWS";
      console.warn("[Nexora /api/chat] attachment 400: no rows for ids", {
        userId,
        requestedConversationId,
        attachmentIds,
      });
    } else {
      const row = diagRows[0]!;
      if (row.user_id !== userId) {
        failureCode = "WRONG_USER";
        console.warn("[Nexora /api/chat] attachment 400: user mismatch", {
          userId,
          rowUserId: row.user_id,
          attachmentIds,
        });
      } else if (row.status !== "ready") {
        failureCode = "NOT_READY";
        console.warn("[Nexora /api/chat] attachment 400: status not ready", {
          userId,
          status: row.status,
          attachmentIds,
        });
      } else if (!row.extracted_text?.trim()) {
        failureCode = "EMPTY_EXTRACTED_TEXT";
        console.warn(
          "[Nexora /api/chat] attachment 400: ready but empty extracted_text",
          { userId, attachmentIds },
        );
      } else {
        console.warn(
          "[Nexora /api/chat] attachment 400: unexpected empty loadReadyAttachmentsForUser",
          { userId, requestedConversationId, attachmentIds },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Attachment not found or not ready. Wait for upload to finish and try again.",
        details: failureCode,
      } satisfies ChatAPIResponse,
      { status: 400 },
    );
  }

  const lastUserContent = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const lastUserText = plainTextFromChatContent(lastUserContent)
    .replace(/^\uFEFF/, "")
    .trim();

  if (!lastUserText.trim() && attachmentItems.length === 0) {
    return NextResponse.json(
      { error: "Enter a message or attach a file." } satisfies ChatAPIResponse,
      { status: 400 },
    );
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const assistantMessageCount = messages.filter(
    (m) => m.role === "assistant",
  ).length;
  const isFirstConversationTurn =
    userMessageCount === 1 && assistantMessageCount === 0;

  const attachmentChipLine =
    attachmentItems.length > 0
      ? `📎 ${attachmentItems.map((a) => a.originalName).join(", ")}`
      : "";
  const titleSeed = lastUserText.trim() || attachmentChipLine || "New chat";

  let initialConversationTitle = buildConversationTitleFromPrompt(titleSeed);
  if (titleSeed && isFirstConversationTurn) {
    const aiTitle = await maybeGenerateConversationTitle({
      model: languageModel,
      firstUserMessage: titleSeed,
    });
    if (aiTitle) initialConversationTitle = aiTitle;
  }

  const factIntent = detectCurrentFactIntent(lastUserText);
  const presentation = inferChatPresentationHints(lastUserText);
  const responseStyleIntent = classifyChatResponseStyleIntent(
    lastUserText,
    factIntent,
  );
  const liveNewsIntent =
    responseStyleIntent === "live_news" && webSearchEnabled;
  const liveNewsModelSupportsToolFlow =
    supportsGroundedLiveNewsToolFlow(modelId);
  const requiresToolFlowModel = liveNewsIntent || factIntent.currentFact;
  const toolFlowModelUnsupported =
    requiresToolFlowModel && !liveNewsModelSupportsToolFlow;
  const liveNewsGrounded = liveNewsIntent && liveNewsModelSupportsToolFlow;
  const liveNewsModelUnsupported =
    liveNewsIntent && !liveNewsModelSupportsToolFlow;
  let effectiveWebSearch = webSearchEnabled || factIntent.currentFact;
  if (liveNewsGrounded) {
    effectiveWebSearch = true;
  }
  const newsSearchRequired = liveNewsGrounded;
  const forceFirstStepWebSearch = factIntent.currentFact || newsSearchRequired;
  const streamRequested = body.stream === true;
  const useNdjsonStream =
    streamRequested &&
    liveNewsGrounded &&
    effectiveWebSearch &&
    enabledModels.length <= 1;
  logLifecycle("intent_classified", {
    promptPreview: previewForLog(lastUserText, 320),
    responseStyleIntent,
    currentFactIntent: factIntent.currentFact,
    currentFactReason: factIntent.reason ?? null,
    liveNewsIntent,
    liveNewsGrounded,
    liveNewsModelSupportsToolFlow,
    liveNewsModelUnsupported,
    requiresToolFlowModel,
    toolFlowModelUnsupported,
    effectiveWebSearch,
    newsSearchRequired,
    forceFirstStepWebSearch,
    useNdjsonStream,
  });

  let systemPrompt = getAiChatSystemPromptWithModel(modelDisplayName);
  if (presentation.systemAddendum) {
    systemPrompt += presentation.systemAddendum;
  }

  if (factIntent.currentFact) {
    systemPrompt += CURRENT_FACT_SYSTEM_RULES;
  } else if (effectiveWebSearch) {
    systemPrompt += WEB_SEARCH_SYSTEM_SUFFIX;
  }

  if (liveNewsGrounded && effectiveWebSearch) {
    systemPrompt += CURRENT_NEWS_GROUNDED_SYSTEM_RULES;
  }

  systemPrompt += buildAdaptiveResponseStyleSystemBlock(responseStyleIntent);

  const attachmentBlock = attachmentContextForPrompt(attachmentItems, {
    userQuestion: lastUserText,
  });
  if (attachmentBlock) {
    systemPrompt += `\n\n${attachmentBlock}`;
  }

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

  for (let i = normalizedTurnMessages.length - 1; i >= 0; i--) {
    const m = normalizedTurnMessages[i];
    if (m?.role === "user") {
      if (!m.content.trim() && attachmentItems.length > 0) {
        normalizedTurnMessages[i] = {
          role: "user",
          content:
            "Answer using the attached document(s) supplied in your instructions.",
        };
      }
      break;
    }
  }

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
    const persistedUserContent =
      lastUserText.trim() ||
      (attachmentItems.length > 0 ? attachmentChipLine : "");
    if (persistenceClient && persistenceConversationId && persistedUserContent) {
      const { data: userRow } = await persistenceClient
        .from("messages")
        .insert({
          conversation_id: persistenceConversationId,
          user_id: userId,
          role: "user",
          content: persistedUserContent,
          metadata:
            attachmentIds.length > 0
              ? { attachmentIds, attachmentSummary: attachmentChipLine }
              : null,
        })
        .select("id")
        .single();
      if (userRow?.id && attachmentIds.length > 0) {
        await linkAttachmentsToUserMessage(
          persistenceClient,
          userId,
          persistenceConversationId,
          userRow.id,
          attachmentIds,
        );
      }
    }
  } catch (error: unknown) {
    console.warn(
      "[Nexora /api/chat] non-blocking persistence init failed",
      error instanceof Error ? error.message : error,
    );
  }

  try {
    if (toolFlowModelUnsupported) {
      logLifecycle("tool_flow_model_unsupported", {
        reason: "model_not_supported",
        liveNewsIntent,
        currentFactIntent: factIntent.currentFact,
      });
      const unsupportedText = `This model (${modelDisplayName}) doesn’t support Nexora’s live web-grounded flow yet. Please switch to a supported model (for example: GPT-4o mini, Llama 3.3 70B, or Gemini 2.5 Flash) for live-news/current-fact verification.`;
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
        responseStyleIntent,
        liveNewsGrounded: false,
        liveNewsSearchAttempted: liveNewsIntent,
        liveNewsSearchCompleted: false,
        liveNewsFailureReason: "model_not_supported",
      };
      return NextResponse.json(
        {
          text: unsupportedText,
          model: modelDisplayName,
          meta,
        } satisfies ChatAPIResponse,
        { status: 200 },
      );
    }

    const chatTurn = async (
      onLiveNews?: (stage: LiveNewsProgressStage) => void,
    ): Promise<Response> => {
      let liveNewsCache: SearchResponse | null = null;
      let liveNewsConsumed = false;
      const prefetchQueries: string[] = [];
      let prefetchSearchCompleted = false;
      let messagesForModel = messagesWithIdentity;
      let preflightDominantShare: number | undefined;

      if (liveNewsGrounded && effectiveWebSearch) {
        onLiveNews?.("searching");
        prefetchQueries.push(...buildLiveNewsPrefetchQueries(lastUserText));
        logLifecycle("live_news_prefetch_start", {
          searchRequired: newsSearchRequired,
          provider: "tavily",
          queryCount: prefetchQueries.length,
          queries: prefetchQueries,
        });
        onLiveNews?.("fetching");
        try {
          const responses = await Promise.all(
            prefetchQueries.map(async (q) => {
              const t0 = Date.now();
              try {
                const res = await tavilySearch(q, { maxResults: 10 });
                logLifecycle("live_news_prefetch_query_ok", {
                  provider: "tavily",
                  query: q,
                  latencyMs: Date.now() - t0,
                  resultCount: res.results?.length ?? 0,
                });
                return res;
              } catch (error: unknown) {
                logLifecycle("live_news_prefetch_query_error", {
                  provider: "tavily",
                  query: q,
                  latencyMs: Date.now() - t0,
                  error: error instanceof Error ? error.message : String(error),
                });
                throw error;
              }
            }),
          );
          prefetchSearchCompleted = responses.some(
            (r) =>
              Boolean(r.answer?.trim()) || (r.results?.length ?? 0) > 0,
          );
          liveNewsCache = mergeLiveNewsPrefetchResponses(responses);
          onLiveNews?.("clustering");
          let clusters = clusterLiveNewsResults(liveNewsCache.results ?? []);
          const rankingMode = getLiveNewsRankingMode(lastUserText);
          clusters = rankClustersBySignificance(clusters, rankingMode);
          preflightDominantShare = dominantDomainShare(clusters);
          const diversity = buildSourceDiversityGuidance(clusters);
          const clusterBlock = formatClustersForSystemPrompt(clusters, {
            rankingMode,
          });
          const block = `\n\n**Retrieval note:** About ${Math.round((preflightDominantShare ?? 0) * 100)}% of raw results came from one domain — diversify headlines when possible.\n\n${diversity}\n\n${clusterBlock}`;
          const sys0 = messagesWithIdentity[0];
          if (sys0?.role === "system") {
            messagesForModel = [
              { role: "system", content: sys0.content + block },
              ...messagesWithIdentity.slice(1),
            ];
          }
          logLifecycle("live_news_prefetch_complete", {
            searchCompleted: prefetchSearchCompleted,
            mergedResultCount: liveNewsCache.results?.length ?? 0,
            pageReadsCompleted: 0,
            openedDocuments: 0,
          });
        } catch (pe: unknown) {
          console.warn(
            "[Nexora /api/chat] live news preflight failed",
            pe instanceof Error ? pe.message : pe,
          );
          liveNewsCache = null;
          prefetchSearchCompleted = false;
          prefetchQueries.length = 0;
          logLifecycle("live_news_prefetch_failed", {
            error: pe instanceof Error ? pe.message : String(pe),
          });
        }
      }
      logLifecycle("page_read_stage", {
        pageReadsExecuted: false,
        openedDocuments: 0,
      });

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
          const searchStartedAt = Date.now();
          const sanitized = sanitizeLiveWebSearchQuery({
            query,
            userText: lastUserText,
            factIntent,
            liveNewsGrounded,
          });
          logLifecycle("tool_search_attempt", {
            provider: "tavily",
            rawQuery: query,
            sanitizedQuery: sanitized,
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

          if (liveNewsGrounded && liveNewsCache && !liveNewsConsumed) {
            liveNewsConsumed = true;
            executedWebSearchQueries.push(...prefetchQueries, sanitized);
            logLifecycle("tool_search_resolved_from_prefetch_cache", {
              provider: "tavily",
              query: sanitized,
              latencyMs: Date.now() - searchStartedAt,
              resultCount: liveNewsCache.results?.length ?? 0,
            });
            return liveNewsCache as unknown as Record<string, unknown>;
          }

          executedWebSearchQueries.push(sanitized);
          try {
            const searchResult = await tavilySearch(sanitized);
            const filtered = liveNewsGrounded
              ? filterLiveNewsSearchResponse(searchResult)
              : searchResult;
            logLifecycle("tool_search_success", {
              provider: "tavily",
              query: sanitized,
              latencyMs: Date.now() - searchStartedAt,
              resultCount: filtered.results?.length ?? 0,
            });
            return filtered as unknown as Record<string, unknown>;
          } catch (err: unknown) {
            const message =
              err instanceof Error ? err.message : "Search failed.";
            logLifecycle("tool_search_error", {
              provider: "tavily",
              query: sanitized,
              latencyMs: Date.now() - searchStartedAt,
              error: message,
            });
            return { error: message };
          }
        },
      });

      const toolLoopArgs = {
        tools: { webSearch: webSearchTool },
        stopWhen: stepCountIs(12),
        ...(forceFirstStepWebSearch
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
        onLiveNews?.("summarizing");
        const inputChars = messagesForModel.reduce(
          (sum, m) => sum + m.content.length,
          0,
        );
        logLifecycle("synthesis_start", {
          synthesisModelId: modelId,
          synthesisProvider: modelProvider,
          inputMessageCount: messagesForModel.length,
          inputChars,
          inputTokenEstimate: Math.round(inputChars / 4),
        });
        return generateText({
          model: languageModel,
          messages: messagesForModel,
          ...(useWebSearchToolLoop ? toolLoopArgs : {}),
        });
      };

    const runGenerateOnce = async () => {
      try {
        const t0 = Date.now();
        const result = await runGenerate();
        logLifecycle("synthesis_complete", {
          latencyMs: Date.now() - t0,
          stepCount: result.steps.length,
          outputChars: result.text.trim().length,
        });
        return { ok: true as const, result };
      } catch (error: unknown) {
        logLifecycle("synthesis_failed", {
          latencyMs: 0,
          failureStage: "before_or_during_generation",
          error: error instanceof Error ? error.message : String(error),
        });
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
        liveNewsGrounded: false,
        liveNewsSearchAttempted: liveNewsGrounded && effectiveWebSearch,
        liveNewsSearchCompleted: false,
        liveNewsFailureReason:
          liveNewsGrounded && effectiveWebSearch
            ? "tool_loop_failed"
            : undefined,
      };
      logLifecycle("fallback_selected", {
        path: "first_pass_generation_failure",
        userFacingReason: "tool_or_function_failure",
      });
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

    if (forceFirstStepWebSearch && webQueries.length === 0) {
      console.warn(
        "[Nexora /api/chat] current-fact/live-news: zero webSearch calls after first pass; retrying once",
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
          liveNewsGrounded: false,
          liveNewsSearchAttempted: liveNewsGrounded && effectiveWebSearch,
          liveNewsSearchCompleted: false,
          liveNewsFailureReason:
            liveNewsGrounded && effectiveWebSearch
              ? "search_not_completed"
              : undefined,
        };
        logLifecycle("fallback_selected", {
          path: "second_pass_generation_failure_after_zero_search_calls",
          userFacingReason: newsSearchRequired
            ? "live_search_not_completed"
            : "current_fact_search_not_completed",
        });
        return NextResponse.json(
          {
            text: newsSearchRequired
              ? liveNewsToolFailureUserMessage()
              : currentFactToolFailureUserMessage(
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

    const hasToolSearch = webQueries.length > 0;
    const liveNewsSearchCompleted = hasToolSearch || prefetchSearchCompleted;
    const guardTriggered =
      forceFirstStepWebSearch &&
      webQueries.length === 0 &&
      !(newsSearchRequired && prefetchSearchCompleted);
    let responseText = result.text.trim();
    if (guardTriggered) {
      console.warn(
        "[Nexora /api/chat] current-fact/live-news guard: no webSearch tool executed; returning safe limitation message",
      );
      responseText = newsSearchRequired
        ? liveNewsToolFailureUserMessage()
        : currentFactToolFailureUserMessage(
            "current office-holder / live fact",
          );
      logLifecycle("fallback_selected", {
        path: "search_guard_triggered_zero_tool_calls",
        userFacingReason: newsSearchRequired
          ? "live_search_not_completed"
          : "current_fact_search_not_completed",
      });
    } else if (effectiveWebSearch && webQueries.length === 0) {
      responseText = stripFalseVerificationClaimsWhenNoTools(responseText);
      logLifecycle("no_search_calls_strip_verification_claims", {
        liveNews: liveNewsGrounded,
        currentFact: factIntent.currentFact,
      });
    }

    let liveNewsStructured = liveNewsGrounded
      ? parseLiveNewsStructuredPayload(responseText)
      : null;
    if (liveNewsStructured) {
      responseText = stripLiveNewsJsonFromText(responseText);
      if (
        typeof preflightDominantShare === "number" &&
        liveNewsStructured.dominantDomainShare === undefined
      ) {
        liveNewsStructured = {
          ...liveNewsStructured,
          dominantDomainShare: preflightDominantShare,
        };
      }
    }

    if (hasPipeTableSignal(responseText)) {
      logLifecycle("assistant_text_table_debug", {
        textLength: responseText.length,
        newlineCount: (responseText.match(/\n/g) ?? []).length,
        escapedNewlineCount: (responseText.match(/\\n/g) ?? []).length,
        rawJsonPreview: JSON.stringify(responseText).slice(0, 1800),
      });
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
      liveNewsGrounded:
        liveNewsGrounded && effectiveWebSearch && liveNewsSearchCompleted,
      liveNewsSearchAttempted: liveNewsGrounded && effectiveWebSearch,
      liveNewsSearchCompleted:
        liveNewsGrounded && effectiveWebSearch && liveNewsSearchCompleted,
      liveNewsFailureReason:
        liveNewsGrounded &&
        effectiveWebSearch &&
        !liveNewsSearchCompleted &&
        newsSearchRequired
          ? "search_not_completed"
          : undefined,
      liveNewsStructured: liveNewsStructured ?? undefined,
      liveNewsPrefetchQueries:
        prefetchQueries.length > 0 ? prefetchQueries : undefined,
    };
    logLifecycle("response_finalized", {
      elapsedMs: Date.now() - requestStartedAt,
      webSearchCalls: webQueries.length,
      prefetchSearchCompleted,
      liveNewsSearchCompleted,
      liveNewsFailureReason: meta.liveNewsFailureReason ?? null,
      currentFactGuardTriggered: guardTriggered,
      responseTextChars: responseText.length,
    });

    console.log(
      `[Nexora /api/chat] response ready: ${modelProvider}/${modelId} (${modelDisplayName}) effectiveWebSearch=${effectiveWebSearch} currentFact=${factIntent.currentFact} reason=${factIntent.reason ?? "n/a"} style=${responseStyleIntent} liveNews=${liveNewsGrounded} toolCalls=${webQueries.length} steps=${result.steps.length} guard=${guardTriggered} lastUserLen=${lastUserText.length}`,
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
            liveNewsGrounded:
              liveNewsGrounded && effectiveWebSearch && liveNewsSearchCompleted,
            liveNewsSearchAttempted: liveNewsGrounded && effectiveWebSearch,
            liveNewsSearchCompleted:
              liveNewsGrounded && effectiveWebSearch && liveNewsSearchCompleted,
            liveNewsFailureReason:
              liveNewsGrounded &&
              effectiveWebSearch &&
              !liveNewsSearchCompleted &&
              newsSearchRequired
                ? "search_not_completed"
                : null,
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
    };

    if (useNdjsonStream) {
      const encoder = new TextEncoder();
      logLifecycle("streaming_mode_started", { mode: "ndjson" });
      return new Response(
        new ReadableStream({
          async start(controller) {
            const send = (o: unknown) =>
              controller.enqueue(
                encoder.encode(`${JSON.stringify(o)}\n`),
              );
            try {
              const res = await chatTurn((stage) =>
                send({ type: "progress", stage }),
              );
              logLifecycle("streaming_chat_turn_completed", {
                status: res.status,
              });
              const payload = (await res.json()) as ChatAPIResponse;
              send({
                type: "done",
                text: payload.text,
                model: payload.model,
                meta: payload.meta,
                error: payload.error,
                details: payload.details,
              });
            } catch (e: unknown) {
              logLifecycle("streaming_failed", {
                failureStage: "during_streaming_before_done_event",
                error: e instanceof Error ? e.message : String(e),
              });
              send({
                type: "error",
                error:
                  e instanceof Error
                    ? e.message
                    : "Unable to generate response.",
              });
            } finally {
              controller.close();
            }
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return await chatTurn(undefined);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to generate chat response.";
    console.error("[Nexora /api/chat] lifecycle", {
      requestId,
      modelId,
      modelProvider,
      stage: "route_failed_after_completion",
      error: message,
    });
    return NextResponse.json(
      {
        error: "Unable to generate chat response.",
        details: message,
      } satisfies ChatAPIResponse,
      { status: 500 },
    );
  }
}
