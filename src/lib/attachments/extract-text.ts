import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export type ExtractResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

function truncateForStorage(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[…truncated at ${maxChars} characters…]`;
}

const MAX_STORED_CHARS = 500_000;

/**
 * Extract plain text server-side for supported MIME types.
 */
export async function extractTextFromFile(
  mimeType: string,
  buffer: Buffer,
): Promise<ExtractResult> {
  try {
    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      const text = buffer.toString("utf8");
      if (!text.trim()) {
        return { ok: false, error: "File is empty." };
      }
      return { ok: true, text: truncateForStorage(text, MAX_STORED_CHARS) };
    }

    if (mimeType === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text: raw } = await extractText(pdf, { mergePages: true });
      const text = (raw ?? "").trim();
      if (!text) {
        return { ok: false, error: "No extractable text in PDF." };
      }
      return { ok: true, text: truncateForStorage(text, MAX_STORED_CHARS) };
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      const text = value.trim();
      if (!text) {
        return { ok: false, error: "No extractable text in DOCX." };
      }
      return { ok: true, text: truncateForStorage(text, MAX_STORED_CHARS) };
    }

    return { ok: false, error: `Unsupported type: ${mimeType}` };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed.";
    return { ok: false, error: message };
  }
}
