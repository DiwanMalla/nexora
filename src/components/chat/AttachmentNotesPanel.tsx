"use client";

import { X, FileText, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AttachmentNote } from "@/types";

type Props = {
  note: AttachmentNote | null;
  onClose: () => void;
};

export function AttachmentNotesPanel({ note, onClose }: Props) {
  if (!note) return null;

  const keyTakeaways = note.sections.slice(0, 5).map((s) => {
    const firstSentence = s.content.split(/(?<=[.!?])\s+/)[0] ?? s.content;
    return `${s.heading}: ${firstSentence}`.slice(0, 220);
  });

  const strengths = [
    note.title ? "Clear document identity detected from extracted text." : null,
    note.sections.length > 1
      ? "Section structure was detected and organized for review."
      : "A compact content preview was generated for quick understanding.",
    "Notes are grounded in extracted content rather than hidden inference.",
  ].filter((v): v is string => Boolean(v));

  const weaknesses = [
    ...(note.uncertainties ?? []),
    note.sections.length <= 1
      ? "Limited heading signal may reduce section-level accuracy."
      : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <aside className="fixed right-0 top-0 z-40 h-full w-full max-w-md border-l border-border bg-bg-elevated shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text" />
            <div className="text-sm font-semibold text-text">Attachment Notes</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-text-muted hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-4 text-sm">
          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
              File
            </div>
            <div className="mt-1 font-semibold text-text">{note.fileName}</div>
            <div className="text-xs text-text-muted">{note.fileType}</div>
          </section>

          {note.title ? (
            <section>
              <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
                Detected Title
              </div>
              <div className="mt-1 text-text">{note.title}</div>
            </section>
          ) : null}

          <section>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-dim">
              <Sparkles className="h-3.5 w-3.5" />
              AI Summary
            </div>
            <div className="mt-1 rounded-lg border border-border bg-bg-card p-3 text-text">
              <div className="typography-prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.summary}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          {keyTakeaways.length > 0 ? (
            <section>
              <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
                Key Takeaways
              </div>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-text">
                {keyTakeaways.map((k, i) => (
                  <li key={`${k}-${i}`}>{k}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {note.sections.length > 0 ? (
            <section>
              <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
                Main Contents
              </div>
              <div className="mt-2 space-y-2">
                {note.sections.map((s, idx) => (
                  <div
                    key={`${s.heading}-${idx}`}
                    className="rounded-lg border border-border bg-bg-card p-2.5"
                  >
                    <div className="text-xs font-semibold text-text">{s.heading}</div>
                    <div className="mt-1 typography-prose max-w-none text-xs text-text-muted">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {s.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
              Reviewer Notes
            </div>
            <div className="mt-2 grid gap-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Strengths
                </div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-emerald-100/90">
                  {strengths.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Weaknesses / Risks
                </div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-100/90">
                  {(weaknesses.length > 0
                    ? weaknesses
                    : ["No major extraction warnings were detected."]).map(
                    (w, i) => (
                      <li key={`${w}-${i}`}>{w}</li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </section>

          {note.extractedTextPreview ? (
            <section>
              <div className="text-xs font-bold uppercase tracking-wide text-text-dim">
                Raw Extract Preview (truncated)
              </div>
              <div className="mt-1 rounded-lg border border-border bg-bg-card p-2.5 text-xs text-text-muted">
                <div className="typography-prose max-w-none whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {note.extractedTextPreview}
                  </ReactMarkdown>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
