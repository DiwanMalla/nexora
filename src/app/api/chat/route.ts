import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";

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
  const typedMessages = messages as ChatMsg[];

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
      return NextResponse.json({ text }, { status: 200 });
    } catch {
      return NextResponse.json(
        { error: "Unable to generate chat response." },
        { status: 500 },
      );
    }
  }

  const modelId = enabledModels.length === 1 ? enabledModels[0] : model;
  type ChatMsg = { role: "user" | "assistant" | "system"; content: string };
  try {
    const result = await generateText({
      model: groq(modelId),
      messages: messages as ChatMsg[],
    });
    return NextResponse.json({ text: result.text }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate chat response." },
      { status: 500 },
    );
  }
}
