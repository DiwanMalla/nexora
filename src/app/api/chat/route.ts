import { generateText, tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";
import { z } from "zod";
import { tavilySearch } from "@/lib/tavily";
import { getModelNameByApiId } from "@/lib/ai-providers";

export const runtime = "edge";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * When enabledModels has 2+ IDs: run all in parallel, then one consensus call
 * so the final response is agreed by all. Keeps latency ~max(models) + one fast synthesis.
 */
async function runCompetingConsensus(
  messages: { role: string; content: string }[],
  enabledModelIds: string[],
): Promise<string> {
  const lastUser = messages.filter((m) => m.role === "user").pop();
  const userContent = lastUser?.content ?? "";

  type ChatMsg = { role: "user" | "assistant" | "system"; content: string };
  const systemMsg: ChatMsg = {
    role: "system",
    content:
      "You are Nexora, a helpful AI assistant. Multiple models are used to combine the best answer. When asked who or what you are, say you're Nexora.",
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
  if (valid.length === 0) return "I couldn't generate a response from any model.";
  if (valid.length === 1) return valid[0].text;

  const consensusPrompt = `You are a moderator. The user asked:

"${userContent}"

The following AI models each gave a response. Produce a single response that best answers the user and that all models would agree with. Be concise and accurate. Output only the final agreed answer, no meta-commentary.

Model responses:
${valid.map((r, i) => `--- Model ${i + 1} ---\n${r.text}`).join("\n\n")}

Agreed response:`;

  const consensusModel = enabledModelIds[0];
  const consensus = await generateText({
    model: groq(consensusModel),
    messages: [{ role: "user" as const, content: consensusPrompt }],
  });

  return consensus.text.trim() || valid[0].text;
}

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
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const messages = body.messages ?? [];
  const model = body.model || DEFAULT_MODEL;
  const enabledModels = Array.isArray(body.enabledModels)
    ? body.enabledModels.filter((id) => typeof id === "string" && id.length > 0)
    : [];

  if (enabledModels.length > 1) {
    try {
      const text = await runCompetingConsensus(messages, enabledModels);
      const modelLabel =
        enabledModels.length > 0
          ? enabledModels
              .map((id) => getModelNameByApiId(id) ?? id)
              .join(", ")
          : "consensus";
      return NextResponse.json(
        { text, model: modelLabel },
        { status: 200 },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Consensus request failed.";
      return NextResponse.json(
        { error: "Unable to generate chat response.", details: message },
        { status: 500 },
      );
    }
  }

  const modelId = enabledModels.length === 1 ? enabledModels[0] : model;
  type ChatMsg = { role: "user" | "assistant" | "system"; content: string };
  const modelDisplayName = getModelNameByApiId(modelId) ?? modelId;
  const systemPrompt = `You are Nexora, a helpful AI assistant. You are powered by the model: ${modelDisplayName}.

When users ask "which AI model are you?", "what model are you?", "who are you?", "are you Kimi?", "are you GPT OSS?", or any identity question about which model powers you:
- You MUST state that you are Nexora and that you are powered by ${modelDisplayName}.
- Use a clear phrase like: "I'm Nexora, powered by ${modelDisplayName}." or "I'm powered by ${modelDisplayName}." Do not reply with only "I'm Nexora." — always include the model name (${modelDisplayName}) in your answer.`;
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
          description: "Search the web for up-to-date information, facts, news, and history.",
          parameters: z.object({
            query: z.string().describe("The search query"),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
              return await tavilySearch(query);
            } catch (err: any) {
              return { error: err.message || "Search failed." };
            }
          },
        }),
      },
    });
    return NextResponse.json(
      { text: result.text, model: modelDisplayName },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to generate chat response.";
    return NextResponse.json(
      { error: "Unable to generate chat response.", details: message },
      { status: 500 },
    );
  }
}
