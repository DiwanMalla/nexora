import type { Json } from "@/types/supabase";

export type AttachmentNoteSection = {
  heading: string;
  content: string;
};

export type AttachmentNote = {
  id: string;
  attachmentId: string;
  fileName: string;
  fileType: string;
  title?: string;
  summary: string;
  sections: AttachmentNoteSection[];
  extractedTextPreview?: string;
  uncertainties?: string[];
  createdAt: string;
};

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function detectTitle(lines: string[]): string | undefined {
  const candidates = lines
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => line.length >= 6 && line.length <= 120)
    .slice(0, 24);
  return candidates.find((line) =>
    /\b(week|tutorial|assignment|course|module|project|report|lab|task)\b/i.test(
      line,
    ),
  );
}

function detectSections(lines: string[]): AttachmentNoteSection[] {
  const headings: Array<{ i: number; heading: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = cleanLine(lines[i] ?? "");
    if (!line) continue;
    if (
      /^(task|question|section|chapter|part)\s*\d+/i.test(line) ||
      /^#+\s+/.test(line) ||
      /^([A-Z][A-Z\s]{3,}|[A-Z][\w\s]{2,}:)$/.test(line)
    ) {
      headings.push({ i, heading: line.replace(/^#+\s+/, "") });
    }
  }
  if (headings.length === 0) {
    const body = lines
      .slice(0, 20)
      .map(cleanLine)
      .filter(Boolean)
      .join(" ");
    return body
      ? [{ heading: "Document preview", content: body.slice(0, 320) }]
      : [];
  }

  const out: AttachmentNoteSection[] = [];
  for (let n = 0; n < headings.length; n++) {
    const start = headings[n]!.i + 1;
    const end = n + 1 < headings.length ? headings[n + 1]!.i : lines.length;
    const content = lines
      .slice(start, end)
      .map(cleanLine)
      .filter(Boolean)
      .join(" ")
      .slice(0, 420);
    out.push({
      heading: headings[n]!.heading,
      content: content || "No detail extracted under this heading.",
    });
    if (out.length >= 8) break;
  }
  return out;
}

export function buildAttachmentNote(params: {
  attachmentId: string;
  fileName: string;
  fileType: string;
  extractedText: string;
}): AttachmentNote {
  const { attachmentId, fileName, fileType, extractedText } = params;
  const lines = extractedText.split(/\r?\n/);
  const compact = lines.map(cleanLine).filter(Boolean);
  const preview = compact.slice(0, 20).join(" ").slice(0, 1400);
  const title = detectTitle(lines);
  const sections = detectSections(lines);
  const summaryBase =
    compact
      .slice(0, 10)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() || "Document text extracted successfully.";
  const summary =
    summaryBase.length > 360
      ? `${summaryBase.slice(0, 360)}...`
      : summaryBase;

  const uncertainties: string[] = [];
  if (/\[\u2026truncated at \d+ characters\u2026\]/i.test(extractedText)) {
    uncertainties.push(
      "Extraction was truncated due to storage limits; later sections may be missing.",
    );
  }
  if (/\[\u2026truncated for context limit\u2026\]/i.test(extractedText)) {
    uncertainties.push(
      "Prompt context can be truncated; model may not see full document text.",
    );
  }
  if (sections.length <= 1) {
    uncertainties.push(
      "Could not confidently detect full section structure from extracted text.",
    );
  }

  return {
    id: `note-${attachmentId}`,
    attachmentId,
    fileName,
    fileType,
    title,
    summary,
    sections,
    extractedTextPreview: preview || undefined,
    uncertainties: uncertainties.length > 0 ? uncertainties : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function toAttachmentNoteJson(note: AttachmentNote): Json {
  return note as unknown as Json;
}

export function parseAttachmentNote(
  value: unknown,
): AttachmentNote | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (
    typeof v.attachmentId !== "string" ||
    typeof v.fileName !== "string" ||
    typeof v.fileType !== "string" ||
    typeof v.summary !== "string"
  ) {
    return undefined;
  }
  return {
    id: typeof v.id === "string" ? v.id : `note-${v.attachmentId}`,
    attachmentId: v.attachmentId,
    fileName: v.fileName,
    fileType: v.fileType,
    title: typeof v.title === "string" ? v.title : undefined,
    summary: v.summary,
    sections: Array.isArray(v.sections)
      ? v.sections
          .map((s) => s as Record<string, unknown>)
          .filter(
            (s) => typeof s.heading === "string" && typeof s.content === "string",
          )
          .map((s) => ({ heading: s.heading as string, content: s.content as string }))
      : [],
    extractedTextPreview:
      typeof v.extractedTextPreview === "string"
        ? v.extractedTextPreview
        : undefined,
    uncertainties: Array.isArray(v.uncertainties)
      ? v.uncertainties.filter((u): u is string => typeof u === "string")
      : undefined,
    createdAt:
      typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
  };
}
