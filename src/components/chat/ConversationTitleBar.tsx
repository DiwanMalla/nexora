"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildConversationTitleFromPrompt } from "@/lib/chat/conversation-title";

type ConversationTitleBarProps = {
  conversationId?: string | null;
  firstUserMessage?: string;
  className?: string;
};

export function ConversationTitleBar({
  conversationId,
  firstUserMessage,
  className,
}: ConversationTitleBarProps) {
  const fallbackTitle = useMemo(
    () =>
      buildConversationTitleFromPrompt(
        firstUserMessage?.trim() || "Untitled conversation",
      ),
    [firstUserMessage],
  );

  const [title, setTitle] = useState(fallbackTitle);
  const [draft, setDraft] = useState(fallbackTitle);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(fallbackTitle);
    setDraft(fallbackTitle);
  }, [fallbackTitle]);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    void fetch(`/api/history/${encodeURIComponent(conversationId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          conversation?: { title?: string };
        };
        if (!active || !res.ok) return;
        const next = payload.conversation?.title?.trim();
        if (!next) return;
        setTitle(next);
        setDraft(next);
      })
      .catch(() => {
        // Keep fallback title if fetch fails.
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  const handleSave = async () => {
    if (!conversationId) return;
    const next = draft.replace(/\s+/g, " ").trim();
    if (!next) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error("save failed");
      setTitle(next);
      setDraft(next);
      setEditing(false);
    } catch {
      // no-op: keep editing state for retry
    } finally {
      setSaving(false);
    }
  };

  if (!conversationId && !firstUserMessage) return null;

  return (
    <div className={cn("mb-4 flex items-center justify-center", className)}>
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface-overlay/50 px-4 py-2">
        {editing ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-[22rem] max-w-[60vw] bg-transparent text-center text-sm font-semibold text-text outline-none"
              maxLength={120}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md p-1 text-text-muted hover:text-text"
              aria-label="Save title"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(title);
                setEditing(false);
              }}
              disabled={saving}
              className="rounded-md p-1 text-text-muted hover:text-text"
              aria-label="Cancel title edit"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="max-w-[62vw] truncate text-sm font-semibold text-text">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-text-muted hover:text-text"
              aria-label="Edit conversation title"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
