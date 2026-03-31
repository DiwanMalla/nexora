import { generateText, type LanguageModel } from "ai";

function cleanTitle(raw: string): string {
  const trimmed = raw
    .replace(/[`*_#>]/g, "")
    .replace(/["“”']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const singleLine = trimmed.split("\n")[0]?.trim() ?? "";
  if (!singleLine) return "";
  if (singleLine.length <= 80) return singleLine;
  return `${singleLine.slice(0, 77).trimEnd()}...`;
}

/**
 * Generates a short conversation title (3-7 words) from first user prompt.
 * Non-throwing: returns null if generation fails or yields unusable text.
 */
export async function maybeGenerateConversationTitle(params: {
  model: LanguageModel;
  firstUserMessage: string;
  assistantMessage?: string;
}): Promise<string | null> {
  const first = params.firstUserMessage.replace(/\s+/g, " ").trim();
  if (!first) return null;

  try {
    const result = await generateText({
      model: params.model,
      temperature: 0.2,
      maxOutputTokens: 24,
      messages: [
        {
          role: "system",
          content:
            "Generate a concise conversation title in 3 to 7 words. Do not use quotes. No markdown. Keep it specific and human-friendly.",
        },
        {
          role: "user",
          content: `First user message: ${first}`,
        },
        ...(params.assistantMessage
          ? [
              {
                role: "user" as const,
                content: `Optional assistant context: ${params.assistantMessage.slice(0, 240)}`,
              },
            ]
          : []),
      ],
    });
    const title = cleanTitle(result.text);
    if (!title || title.length < 4) return null;
    return title;
  } catch {
    return null;
  }
}
