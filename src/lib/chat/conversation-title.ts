/**
 * Fast, deterministic fallback title from first user prompt.
 * Keeps history usable even before optional AI title polishing.
 */
export function buildConversationTitleFromPrompt(
  prompt: string,
  maxLen = 68,
): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled conversation";

  const withCapitalizedFirst = clean[0]
    ? clean[0].toUpperCase() + clean.slice(1)
    : clean;

  if (withCapitalizedFirst.length <= maxLen) return withCapitalizedFirst;
  return `${withCapitalizedFirst.slice(0, Math.max(1, maxLen - 3)).trimEnd()}...`;
}
