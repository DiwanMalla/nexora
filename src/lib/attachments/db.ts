import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  buildAttachmentContextBlock,
  type AttachmentPromptOptions,
} from "@/lib/attachments/context";
import type { AttachmentContextItem } from "@/lib/attachments/context";

/** v1: one attachment per message. */
export function normalizeAttachmentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 1);
}

export async function loadReadyAttachmentsForUser(
  client: SupabaseClient<Database>,
  userId: string,
  ids: string[],
): Promise<AttachmentContextItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await client
    .from("attachments")
    .select("id,original_name,mime_type,extracted_text,status,user_id")
    .in("id", ids)
    .eq("user_id", userId)
    .eq("status", "ready");

  if (error) {
    console.warn(
      "[attachments] loadReadyAttachmentsForUser query error",
      error.message,
    );
    return [];
  }

  if (!data?.length) {
    return [];
  }

  const items: AttachmentContextItem[] = [];
  for (const row of data) {
    const text = row.extracted_text?.trim();
    if (!text) continue;
    items.push({
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      text,
    });
  }

  if (items.length === 0 && data.length > 0) {
    console.warn(
      "[attachments] loadReadyAttachmentsForUser: rows are ready but extracted_text empty",
      { ids },
    );
  }

  // Preserve caller order
  const order = new Map(ids.map((id, i) => [id, i]));
  items.sort(
    (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
  );
  return items;
}

export function attachmentContextForPrompt(
  items: AttachmentContextItem[],
  options?: AttachmentPromptOptions,
): string {
  return buildAttachmentContextBlock(items, options);
}

/**
 * Link uploaded attachments to the user message row. Only updates rows that
 * still have `message_id` null so parallel multi-model calls do not fight.
 */
export async function linkAttachmentsToUserMessage(
  client: SupabaseClient<Database>,
  userId: string,
  conversationId: string,
  messageId: string,
  attachmentIds: string[],
): Promise<void> {
  if (attachmentIds.length === 0) return;

  for (const id of attachmentIds) {
    await client
      .from("attachments")
      .update({
        conversation_id: conversationId,
        message_id: messageId,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .is("message_id", null);
  }
}
