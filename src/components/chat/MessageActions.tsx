/**
 * MessageActions — Reusable action button row for chat messages.
 *
 * Extracted from ChatMessages to reduce component size and enable
 * reuse in multi-chat column views.
 */

"use client";

import { Copy, ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { ICON_ACTION_BUTTON } from "@/lib/styles";

interface MessageActionsProps {
  /** The message text (used for copy-to-clipboard). */
  content: string;
}

/** Copies text to the clipboard. Silently fails if not available. */
function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    /* Clipboard API not available in some contexts */
  });
}

export function MessageActions({ content }: MessageActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => copyToClipboard(content)}
        className={ICON_ACTION_BUTTON}
        title="Copy"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button type="button" className={ICON_ACTION_BUTTON} title="Helpful">
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button type="button" className={ICON_ACTION_BUTTON} title="Not helpful">
        <ThumbsDown className="h-4 w-4" />
      </button>
      <button type="button" className={ICON_ACTION_BUTTON} title="Download">
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
