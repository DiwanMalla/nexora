/** 10 MiB */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Total extracted text injected into model context (per request). */
export const ATTACHMENT_MAX_CONTEXT_CHARS = 120_000;

export const ATTACHMENT_BUCKET = "attachments";

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function inferMimeFromName(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [ext, mime] of Object.entries(EXT_MIME)) {
    if (lower.endsWith(ext)) return mime;
  }
  return null;
}

export function isAllowedAttachmentMime(mime: string, filename: string): boolean {
  const normalized = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(normalized)) return true;
  if (normalized === "application/octet-stream") {
    const inferred = inferMimeFromName(filename);
    return inferred != null && ALLOWED_ATTACHMENT_MIME_TYPES.has(inferred);
  }
  return false;
}

export function resolveAttachmentMime(
  declared: string,
  filename: string,
): string | null {
  const normalized = declared.toLowerCase().split(";")[0]?.trim() ?? "";
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(normalized)) return normalized;
  if (
    normalized === "application/octet-stream" ||
    normalized === "" ||
    normalized === "text/plain"
  ) {
    return inferMimeFromName(filename);
  }
  return null;
}
