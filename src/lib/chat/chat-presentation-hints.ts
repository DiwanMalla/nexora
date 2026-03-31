/**
 * Lightweight heuristics for AI Chat: tone and structure hints from the last user turn.
 * Keeps the user-selected model but steers output toward Omni-style clarity when appropriate.
 */

export type ChatPresentationHints = {
  /** Extra system text to append (may be empty). */
  systemAddendum: string;
};

function joinBlocks(blocks: string[]): string {
  const trimmed = blocks.map((b) => b.trim()).filter(Boolean);
  if (trimmed.length === 0) return "";
  return `\n\n---\n\n## Response adaptation (this turn)\n${trimmed.map((b) => `- ${b}`).join("\n")}`;
}

/**
 * Infers tone / structure guidance from the user's message (no extra model call).
 */
export function inferChatPresentationHints(lastUserText: string): ChatPresentationHints {
  const t = lastUserText.trim().toLowerCase();
  if (t.length < 3) return { systemAddendum: "" };

  const blocks: string[] = [];

  const beginner =
    /\b(grade\s*6|sixth\s*grade|middle\s*school|eli5|explain\s+like\s+i'?m\s+five|explain\s+like\s+i'?m\s+a\s+child|for\s+a\s+kid|for\s+kids|beginner|beginners|new\s+to\s+this|simple\s+terms|layman|non-technical|dumb\s+it\s+down)\b/.test(
      t,
    );
  const technical =
    /\b(technical|engineers?|developer|implementation|rfc|architecture|deep\s+dive|internals|low-level|for\s+experts?)\b/.test(
      t,
    );

  if (beginner && !technical) {
    blocks.push(
      "Use plain language suitable for a curious middle-school reader. Define specialized terms briefly. Prefer short sentences and concrete examples.",
    );
  } else if (technical && !beginner) {
    blocks.push(
      "Assume a technical reader: precise terminology and concise reasoning are fine; still avoid unnecessary jargon.",
    );
  }

  if (
    /\b(outline|bullet\s*points?|numbered\s+list|table|compare|vs\.?|versus|side\s*by\s*side|step\s*by\s*step|sections?|break\s+down|pros\s+and\s+cons)\b/.test(
      t,
    )
  ) {
    blocks.push(
      "Use clear markdown structure: headings (`##` / `###`), bullet or numbered lists, and a comparison **table** when it helps.",
    );
  }

  if (
    /\b(write|draft|compose|email|letter|essay|blog\s*post|linkedin|cover\s*letter|memo|proposal|speech)\b/.test(
      t,
    )
  ) {
    blocks.push(
      "This is a writing task: produce polished copy with a sensible title or lead, logical sections, and appropriate tone for the format.",
    );
  }

  return { systemAddendum: joinBlocks(blocks) };
}
