import { ATTACHMENT_MAX_CONTEXT_CHARS } from "@/lib/attachments/constants";

export type AttachmentContextItem = {
  id: string;
  originalName: string;
  mimeType: string;
  text: string;
};

export type AttachmentPromptOptions = {
  /** Latest user-visible line (before server placeholders). Used to choose explainer-style structure. */
  userQuestion?: string;
};

/** True when the user likely wants a summary / explanation of the upload (not e.g. a narrow factual lookup). */
export function detectAttachmentExplainerIntent(userQuestion: string): boolean {
  const raw = userQuestion.trim();
  if (!raw) return true;
  if (/^📎\s+\S/m.test(raw)) return true;
  const t = raw.toLowerCase();
  return (
    /\b(can you|could you|please)\s+(explain|summar(y|ise|ize)|describe|break down)\b/.test(
      t,
    ) ||
    /\b(explain|describe|summar(y|ise|ize))\s+(this|the)\s+(file|pdf|document|doc|upload|attachment)\b/.test(
      t,
    ) ||
    /\b(summarize|summarise)\s+this\s+document\b/.test(t) ||
    /\btell me about (this|the) (file|pdf|document)\b/.test(t) ||
    /\boverview|outline|walk me through|break (it|this) down\b/.test(t) ||
    /\bwhat'?s?\s+in (here|this|the file|the document|this pdf)\b/.test(t) ||
    /\bwhat\s+is\s+(this|the)\s+(document|file|pdf)\b/.test(t) ||
    /\bwhat\s+does\s+(this|the)\s+file\b/.test(t) ||
    /\b(read|go through)\s+(this|the)\s+(file|pdf|document)\b/.test(t) ||
    /\banalyze (this|the) (doc|document|file|pdf)\b/.test(t) ||
    /\bcontents? of (this|the)\b/.test(t) ||
    /\bhelp me understand (this|the)\b/.test(t) ||
    /\b(this|the)\s+(file|pdf|document)\b.*\b(mean|about|say|for)\b/.test(t)
  );
}

function attachmentInstructionBlock(structuredExplain: boolean): string {
  const core = [
    "## How to use the attachment(s) below",
    "",
    "**Primary source**: The extracted text under “###” file headings is plain text from the user’s upload. Whenever they ask about that file, treat this text as the **authoritative source** — not general knowledge, not guesses about what “might” be in a typical document of that kind.",
    "",
    "**File-explanation rule**: If the user asks to explain, summarize, or walk through an uploaded file (or sends an attachment-only message), **do not stop at identifying the document or its broad purpose.** Explain what the document **actually says**: walk through real sections, tasks, or questions from the extract. Use a clear, confident, helpful tone. Distinguish **verbatim / clearly visible** content from **inference**; never present inference as if it were quoted from the file.",
    "",
    "**Extraction limits**: PDF and Word (DOCX) are plain-text extraction — tables, images, headers/footers, and layout may be partial or reordered. If you see `[…truncated for context limit…]`, state that only part of the file was in context and later material may be missing.",
    "",
    "**Voice**: Explain **directly** (e.g. “The document asks you to…”, “Section 2 covers…”). Avoid weak filler (“it seems like”, “might be about”, “based on the structure”) unless you immediately anchor it to a specific line from the extract.",
    "",
  ];

  if (structuredExplain) {
    core.push(
      "**This turn — required answer shape**: The user wants a **useful, structured explanation** of the upload (similar to a strong tutor walkthrough). Use these **exact `##` headings** in order (skip only if truly inapplicable, and say why in one line):",
      "",
      "## What this file is",
      "— Type of document (assignment, lab, policy, etc.) **only if supported by the extract**; course/title/identifiers that **appear in the text**; one or two sentences on what the document is **for** (grounded in the extract, not generic genre guessing).",
      "",
      "## Main contents",
      "— Break the document into **sections, parts, numbered tasks, or questions exactly as they appear** in the extract. Use bullets or numbered lists that mirror the document’s structure. If the extract has headings or “Task 1 / Question 2” labels, **preserve them**.",
      "",
      "## Simple explanation",
      "— **Teach the material in plain language**: for each major section or task you listed, add a short explanation of what it means and what the reader is supposed to do. Prefer `###` subheadings or bold labels per section so it is easy to scan. This is the core of the answer — not a vague overview.",
      "",
      "## Key takeaways",
      "— 3–8 tight bullets: the most important facts, deliverables, deadlines, or concepts **explicitly present** in the extract.",
      "",
      "## Unclear / partial extraction",
      "— What is missing, cut off, or unreadable (truncation, tables not fully captured, etc.). What you **cannot** confirm from the extract. **Do not invent** content here to sound complete.",
      "",
    );
  } else {
    core.push(
      "**Narrow questions about the file**: Still ground answers in the extract first. Separate what the text **states** from what is **unclear or missing**.",
      "",
    );
  }

  return core.join("\n");
}

/**
 * Build a single system block: instructions plus extracted file text.
 */
export function buildAttachmentContextBlock(
  items: AttachmentContextItem[],
  options?: AttachmentPromptOptions,
): string {
  if (items.length === 0) return "";

  const userQ = options?.userQuestion ?? "";
  const structuredExplain = detectAttachmentExplainerIntent(userQ);

  const sections: string[] = [];
  let total = 0;
  let anyContextTruncated = false;

  for (const item of items) {
    const header = `### ${item.originalName} (${item.mimeType})\n`;
    const remaining = ATTACHMENT_MAX_CONTEXT_CHARS - total - header.length - 20;
    if (remaining <= 0) break;

    let body = item.text;
    if (body.length > remaining) {
      body = `${body.slice(0, remaining)}\n[…truncated for context limit…]`;
      anyContextTruncated = true;
    }
    const chunk = `${header}\n${body}\n`;
    sections.push(chunk);
    total += chunk.length;
    if (total >= ATTACHMENT_MAX_CONTEXT_CHARS) break;
  }

  const intro = attachmentInstructionBlock(structuredExplain);

  const footer =
    anyContextTruncated || sections.some((s) => s.includes("[…truncated for context limit…]"))
      ? "\n**Note**: At least one attachment was truncated for the model context window. Mention that limitation if the user needs full coverage.\n"
      : "";

  return [
    intro,
    "",
    "## Extracted text (verbatim extract — primary source)",
    "",
    ...sections,
    footer,
  ].join("\n");
}
