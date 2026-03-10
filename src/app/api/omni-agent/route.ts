/**
 * POST /api/omni-agent — OmniAgent streaming endpoint.
 *
 * Routes the last user message to a Groq model via routePrompt(), streams
 * the response with Vercel AI SDK streamText, and returns routing metadata
 * in headers X-Omni-Model and X-Omni-Reason.
 */

import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { routePrompt } from "@/lib/omni-router";
import { getNexoraSystemPrompt } from "@/lib/nexora-system-prompt";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

type Message = { role: "user" | "assistant" | "system"; content: string };

function getTextFromParts(
  parts: unknown[] | undefined,
): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (p): p is { type: string; text?: string } =>
        typeof p === "object" && p !== null && (p as { type?: string }).type === "text",
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

type IncomingMessage = {
  role?: string;
  content?: string;
  parts?: unknown[];
};

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: IncomingMessage[] };
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = toModelMessages(raw);
    const lastContent = getLastUserContent(raw);

    const { modelId, reason } = routePrompt(lastContent);

    console.log("[OMNI ROUTER]");
    console.log('Prompt: "' + lastContent + '"');
    console.log("Selected Model:", modelId);
    console.log("Reason:", reason);

    const systemPrompt = getNexoraSystemPrompt();

    const messagesWithSystem: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const result = streamText({
      model: groq(modelId as Parameters<typeof groq>[0]),
      messages: messagesWithSystem,
    });

    const headers = new Headers({
      "X-Omni-Model": modelId,
      "X-Omni-Reason": reason,
    });

    return result.toUIMessageStreamResponse({
      headers,
    });
  } catch (_err) {
    return Response.json(
      { error: "AI service temporarily unavailable" },
      { status: 500 },
    );
  }
}
