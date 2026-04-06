/**
 * POST /api/attachments — upload one file (pdf/txt/md/docx), store in Supabase Storage,
 * extract text, persist metadata. Clerk-authenticated; server uses service role for storage/DB.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ATTACHMENT_BUCKET,
  ATTACHMENT_MAX_BYTES,
  resolveAttachmentMime,
} from "@/lib/attachments/constants";
import { extractTextFromFile } from "@/lib/attachments/extract-text";

export const runtime = "nodejs";

async function ensureConversationForAttachment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  conversationId: string,
  agentType: string | null,
): Promise<void> {
  await supabase.from("profiles").upsert(
    { id: userId },
    { onConflict: "id", ignoreDuplicates: false },
  );

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from("conversations").insert({
    id: conversationId,
    user_id: userId,
    title: "New conversation",
    model: null,
    agent_type: agentType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function safeBasename(name: string): string {
  const base = name
    .replace(/^.*[/\\]/, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .slice(0, 180);
  return base.trim() || "file";
}

export async function POST(req: Request) {
  const authState = await auth();
  const userId = authState.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const conversationIdRaw = form.get("conversationId");
  let conversationId: string | null = null;
  if (typeof conversationIdRaw === "string" && conversationIdRaw.trim()) {
    conversationId = conversationIdRaw.trim();
  }

  const agentTypeRaw = form.get("agentType");
  const agentType =
    typeof agentTypeRaw === "string" && agentTypeRaw.trim()
      ? agentTypeRaw.trim().slice(0, 64)
      : null;

  if (file.size > ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB).` },
      { status: 400 },
    );
  }

  const mimeResolved = resolveAttachmentMime(file.type || "", file.name);
  if (!mimeResolved) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Use PDF, TXT, MD, or DOCX.",
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  if (conversationId) {
    try {
      await ensureConversationForAttachment(
        supabase,
        userId,
        conversationId,
        agentType,
      );
    } catch (err) {
      console.warn(
        "[attachments] ensureConversationForAttachment failed",
        err instanceof Error ? err.message : err,
      );
      return NextResponse.json(
        {
          error:
            "Could not create or verify the conversation for this upload. Try again or start a new chat.",
        },
        { status: 400 },
      );
    }
  }

  const attachmentId = randomUUID();
  const basename = safeBasename(file.name);
  const storagePath = `${userId}/${attachmentId}/${basename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: insertErr, data: inserted } = await supabase
    .from("attachments")
    .insert({
      id: attachmentId,
      user_id: userId,
      conversation_id: conversationId,
      storage_path: storagePath,
      original_name: file.name.slice(0, 512),
      mime_type: mimeResolved,
      size_bytes: file.size,
      status: "processing",
      metadata: { uploaded_via: "api/v1" },
    })
    .select("id")
    .single();

  if (insertErr || !inserted?.id) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Could not create attachment record." },
      { status: 500 },
    );
  }

  const { error: uploadErr } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeResolved,
      upsert: false,
    });

  if (uploadErr) {
    await supabase
      .from("attachments")
      .update({
        status: "error",
        metadata: { error: uploadErr.message },
      })
      .eq("id", attachmentId)
      .eq("user_id", userId);

    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const extracted = await extractTextFromFile(mimeResolved, buffer);

  if (!extracted.ok) {
    await supabase
      .from("attachments")
      .update({
        status: "error",
        metadata: { error: extracted.error },
      })
      .eq("id", attachmentId)
      .eq("user_id", userId);

    return NextResponse.json(
      {
        conversationId: conversationId ?? undefined,
        attachmentId,
        ready: false,
        attachment: {
          id: attachmentId,
          originalName: file.name,
          mimeType: mimeResolved,
          sizeBytes: file.size,
          status: "error" as const,
          error: extracted.error,
        },
      },
      { status: 200 },
    );
  }

  const { error: finalErr } = await supabase
    .from("attachments")
    .update({
      status: "ready",
      extracted_text: extracted.text,
    })
    .eq("id", attachmentId)
    .eq("user_id", userId);

  if (finalErr) {
    return NextResponse.json(
      { error: finalErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      conversationId: conversationId ?? undefined,
      attachmentId,
      ready: true,
      attachment: {
        id: attachmentId,
        originalName: file.name,
        mimeType: mimeResolved,
        sizeBytes: file.size,
        status: "ready" as const,
      },
    },
    { status: 200 },
  );
}
