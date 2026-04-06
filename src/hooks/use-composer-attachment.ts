"use client";

import { useCallback, useRef, useState } from "react";

import {
  ATTACHMENT_MAX_BYTES,
  inferMimeFromName,
} from "@/lib/attachments/constants";
import type { AttachmentNote } from "@/types";

export type ComposerAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  phase: "uploading" | "processing" | "ready" | "error";
  errorMessage?: string;
  note?: AttachmentNote;
};

export type UseComposerAttachmentOptions = {
  /** Allocate or reuse thread id before upload so rows can reference a real conversation. */
  ensureConversationId?: () => string;
  /** Stored on the conversation row when bootstrapping from upload. */
  agentType?: string;
};

/**
 * Single-file composer attachment: upload to /api/attachments, track status for UI.
 */
export function useComposerAttachment(
  conversationId: string | null,
  options?: UseComposerAttachmentOptions,
) {
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAttachment = useCallback(() => setAttachment(null), []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      if (file.size > ATTACHMENT_MAX_BYTES) {
        setAttachment({
          id: "local",
          originalName: file.name,
          mimeType: file.type || inferMimeFromName(file.name) || "",
          sizeBytes: file.size,
          phase: "error",
          errorMessage: `Max size is ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`,
        });
        return;
      }

      const allowedExt = /\.(pdf|txt|md|markdown|docx)$/i;
      if (!allowedExt.test(file.name)) {
        setAttachment({
          id: "local",
          originalName: file.name,
          mimeType: file.type || "",
          sizeBytes: file.size,
          phase: "error",
          errorMessage: "Use PDF, TXT, MD, or DOCX",
        });
        return;
      }

      setAttachment({
        id: "pending",
        originalName: file.name,
        mimeType: file.type || inferMimeFromName(file.name) || "",
        sizeBytes: file.size,
        phase: "uploading",
      });

      const form = new FormData();
      form.append("file", file);
      const convoForUpload =
        options?.ensureConversationId?.() ?? conversationId ?? null;
      if (convoForUpload) {
        form.append("conversationId", convoForUpload);
      }
      const agentType = options?.agentType?.trim();
      if (agentType) {
        form.append("agentType", agentType);
      }

      try {
        setAttachment((prev) =>
          prev
            ? { ...prev, phase: "processing" }
            : {
                id: "pending",
                originalName: file.name,
                mimeType: file.type || "",
                sizeBytes: file.size,
                phase: "processing",
              },
        );

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          attachment?: {
            id: string;
            originalName: string;
            mimeType: string;
            sizeBytes: number;
            status: string;
            error?: string;
            note?: AttachmentNote;
          };
          error?: string;
        };

        if (!res.ok) {
          setAttachment((prev) =>
            prev
              ? {
                  ...prev,
                  phase: "error",
                  errorMessage: data.error ?? "Upload failed",
                }
              : null,
          );
          return;
        }

        const att = data.attachment;
        if (!att) {
          setAttachment((prev) =>
            prev
              ? {
                  ...prev,
                  phase: "error",
                  errorMessage: "Invalid server response",
                }
              : null,
          );
          return;
        }

        if (att.status === "error") {
          setAttachment({
            id: att.id,
            originalName: att.originalName,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            phase: "error",
            errorMessage: att.error ?? "Could not read file",
          });
          return;
        }

        setAttachment({
          id: att.id,
          originalName: att.originalName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          phase: "ready",
          note: att.note,
        });
      } catch {
        setAttachment((prev) =>
          prev
            ? {
                ...prev,
                phase: "error",
                errorMessage: "Network error",
              }
            : null,
        );
      }
    },
    [conversationId, options?.ensureConversationId, options?.agentType],
  );

  return {
    attachment,
    clearAttachment,
    openFilePicker,
    onFileSelected,
    fileInputRef,
  };
}
