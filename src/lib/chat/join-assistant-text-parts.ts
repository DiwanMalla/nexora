/**
 * Joins multiple UI message `text` parts from the AI SDK stream without losing
 * markdown table row boundaries. Plain `join("")` can concatenate consecutive
 * pipe rows into one line when the transport emits separate text parts per row.
 */
export function joinAssistantTextParts(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0] ?? "";

  return chunks.reduce((acc, next) => {
    if (acc === "") return next;
    if (acc.endsWith("\n") || next.startsWith("\n")) return acc + next;

    const lastLine = (acc.match(/[^\n]*$/) ?? [""])[0] ?? "";
    const firstLine = (next.match(/^[^\n]*/) ?? [""])[0] ?? "";
    const lastLooksLikeTableRow = /^\|.+\|\s*$/.test(lastLine.trim());
    const firstLooksLikeTableRow = /^\|/.test(firstLine.trim());

    if (lastLooksLikeTableRow && firstLooksLikeTableRow) {
      return `${acc}\n${next}`;
    }

    return acc + next;
  }, "");
}
