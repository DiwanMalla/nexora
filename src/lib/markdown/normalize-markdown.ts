/**
 * Shared markdown normalization used before ReactMarkdown rendering.
 * Keeps content markdown-safe while fixing common transport/model artifacts.
 */
export function normalizeMarkdownForRender(input: string): string {
  let text = (input ?? "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
  if (!text) return text;

  // If content came through as escaped JSON newlines, unescape once.
  if (!text.includes("\n") && text.includes("\\n")) {
    text = text.replace(/\\n/g, "\n");
  }

  // Keep table rows untouched, but fix common boundary issues where models place
  // the table header inline with prose (e.g. "...: | Col | Col |").
  // This only triggers when a real separator row follows on the next line.
  text = text.replace(
    /([^\n])\s+(\|[^\n]+\|\s*\n\|(?:\s*:?-+:?\s*\|)+)/g,
    "$1\n\n$2",
  );

  // If prose is appended to a table row line, split it into a new paragraph.
  // Example: "| ... | Note: ...".
  text = text.replace(
    /(\n\|[^\n]*\|)\s+((?:Note|Notes|Source|Sources|Explanation)\s*:)/g,
    "$1\n\n$2",
  );

  // Keep readable spacing without flattening markdown structures.
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}
