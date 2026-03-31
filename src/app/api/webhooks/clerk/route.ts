import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getPrimaryEmail(payload: WebhookEvent["data"]): string | null {
  if (!("email_addresses" in payload)) return null;
  const emails = payload.email_addresses;
  if (!Array.isArray(emails) || emails.length === 0) return null;
  const primary = emails.find((e) => e.id === payload.primary_email_address_id);
  return (primary ?? emails[0])?.email_address ?? null;
}

function getDisplayName(payload: WebhookEvent["data"], email: string | null): string {
  const first = "first_name" in payload ? payload.first_name : null;
  const last = "last_name" in payload ? payload.last_name : null;
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || email || "Nexora User";
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const verifier = new Webhook(secret);

  let event: WebhookEvent;
  try {
    event = verifier.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createServiceRoleClient();

  if (event.type === "user.created" || event.type === "user.updated") {
    const userId = event.data.id;
    if (!userId) {
      return new Response("Missing user id", { status: 400 });
    }

    const email = getPrimaryEmail(event.data);
    const displayName = getDisplayName(event.data, email);
    const avatarUrl = "image_url" in event.data ? event.data.image_url : null;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

    if (error) {
      return new Response(`Supabase upsert failed: ${error.message}`, {
        status: 500,
      });
    }
  }

  if (event.type === "user.deleted") {
    const userId = event.data.id;
    if (userId) {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) {
        return new Response(`Supabase delete failed: ${error.message}`, {
          status: 500,
        });
      }
    }
  }

  return new Response("OK", { status: 200 });
}
