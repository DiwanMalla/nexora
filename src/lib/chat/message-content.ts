/**
 * Normalizes chat message `content` from the API into plain text.
 * Clients may send a string or an array of parts (e.g. AI SDK-style `{ type, text }`).
 */

export function plainTextFromChatContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const o = part as Record<string, unknown>;
          if (typeof o.text === "string") return o.text;
          if (typeof o.content === "string") return o.content;
        }
        return "";
      })
      .join("");
  }
  return "";
}
