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

  // Normalize TeX delimiters often leaked by models.
  // \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  text = text.replace(/\\\[\s*/g, "$$\n");
  text = text.replace(/\s*\\\]/g, "\n$$");
  text = text.replace(/\\\(\s*/g, "$");
  text = text.replace(/\s*\\\)/g, "$");
  // KaTeX supports \frac; many models emit \dfrac from LaTeX docs.
  text = text.replace(/\\dfrac/g, "\\frac");

  // Convert bracketed display-math style `[ ... ]` into KaTeX-compatible
  // `$$...$$` blocks when the body looks like TeX/math.
  text = text.replace(/\[\s*([^\[\]\n][\s\S]*?)\s*\]/g, (full, inner: string) => {
    const body = String(inner ?? "").trim();
    if (!body) return full;
    const looksMath =
      /\\(?:frac|ln|boxed|sqrt|times|cdot|approx|leq|geq|neq|sum|prod|int|left|right)/.test(
        body,
      ) ||
      /[=+\-*/^]/.test(body) ||
      /\d/.test(body);
    if (!looksMath) return full;
    return `$$${body}$$`;
  });

  // Wrap bare \boxed{...} with inline math delimiters when missing.
  text = text.replace(
    /(^|[^\$\\])\\boxed\{([^}]+)\}/g,
    (m, p1: string, p2: string) => `${p1}$\\boxed{${p2}}$`,
  );

  // Wrap short bare TeX expressions when models forget delimiters.
  text = text
    .split("\n")
    .map((line) => {
      if (!line || line.includes("$") || line.includes("```")) return line;
      if (!/\\(?:ln|log|frac|dfrac|sqrt|cdot|times|boxed)\b/.test(line)) {
        return line;
      }
      const compact = line.trim();
      const equationLike = /[=+\-*/^]/.test(compact) || /\d/.test(compact);
      if (!equationLike || compact.length > 140) return line;
      return `$${compact}$`;
    })
    .join("\n");

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

  // Ensure ATX headings start a new block when emitted inline after prose.
  // Example: "Intro text ### Step-by-step reasoning".
  text = text.replace(
    /([^\n])\s+(#{1,6}\s+[^\n]+)/g,
    "$1\n\n$2",
  );

  // Ensure ordered/bullet list markers start on their own lines when models
  // emit them inline after a sentence.
  // Example: "Steps: 1. First 2. Second" or "Notes: - item".
  text = text.replace(
    /([^\n])\s+((?:\d+\.\s+|[-*]\s+))/g,
    "$1\n\n$2",
  );

  // Keep readable spacing without flattening markdown structures.
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}
