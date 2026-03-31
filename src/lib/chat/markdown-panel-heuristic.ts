import { stripThinkBlocks } from "@/lib/utils";

/** Agent types that use AI Chat single-thread UX (not full Omni report pipeline). */
const AI_CHAT_STYLE_AGENTS = new Set([
  "aichat",
  "researcher",
  "coder",
  "analyst",
]);

/**
 * Use a subtle document-style panel when the answer is long or already structured,
 * so markdown headings/lists read closer to Omni without boxing every one-liner.
 */
export function useAiChatQualityPanel(
  agentId: string | undefined,
  rawContent: string,
): boolean {
  if (agentId === "omni") return false;
  if (!agentId || !AI_CHAT_STYLE_AGENTS.has(agentId)) return false;
  const c = stripThinkBlocks(rawContent).trim();
  if (c.length < 1) return false;
  if (/(^|\n)#{2,3}\s+\S/m.test(c)) return true;
  if (/\n\|[^\n]+\|\s*\n\|[-:\s|]+\|/m.test(c)) return true;
  if (c.length >= 480) return true;
  return false;
}
