import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isSupabaseAuthConfigError(message: string): boolean {
  return /No suitable key|wrong key type|JWT|invalid signature|auth/i.test(message);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const authState = await auth();
  if (!authState.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!conversationId?.trim()) {
    return NextResponse.json({ error: "Missing conversation id." }, { status: 400 });
  }

  const userId = authState.userId;

  try {
    const runFetch = async (
      client:
        | Awaited<ReturnType<typeof createClerkSupabaseClient>>
        | ReturnType<typeof createServiceRoleClient>,
    ) => {
      const conversation = await client
        .from("conversations")
        .select("id,title,agent_type,updated_at,last_message_at")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

      const messages = await client
        .from("messages")
        .select("id,role,content,model,created_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      return { conversation, messages };
    };

    const clerkClient = await createClerkSupabaseClient();
    let result = await runFetch(clerkClient);

    const authError =
      result.conversation.error && isSupabaseAuthConfigError(result.conversation.error.message);
    if (authError) {
      const service = createServiceRoleClient();
      result = await runFetch(service);
    }

    if (result.conversation.error) {
      return NextResponse.json(
        {
          error: "Unable to load conversation.",
          details: result.conversation.error.message,
        },
        { status: 500 },
      );
    }
    if (result.messages.error) {
      return NextResponse.json(
        { error: "Unable to load messages.", details: result.messages.error.message },
        { status: 500 },
      );
    }
    if (!result.conversation.data) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        conversation: result.conversation.data,
        messages: result.messages.data ?? [],
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Unable to load conversation.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const authState = await auth();
  if (!authState.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!conversationId?.trim()) {
    return NextResponse.json({ error: "Missing conversation id." }, { status: 400 });
  }

  const payload = (await req.json().catch(() => ({}))) as { title?: string };
  const title = payload.title?.replace(/\s+/g, " ").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json(
      { error: "Title must be 120 characters or less." },
      { status: 400 },
    );
  }

  const userId = authState.userId;
  try {
    const updateWith = async (
      client:
        | Awaited<ReturnType<typeof createClerkSupabaseClient>>
        | ReturnType<typeof createServiceRoleClient>,
    ) =>
      client
        .from("conversations")
        .update({ title })
        .eq("id", conversationId)
        .eq("user_id", userId)
        .select("id,title,agent_type,updated_at,last_message_at")
        .maybeSingle();

    const clerkClient = await createClerkSupabaseClient();
    let result = await updateWith(clerkClient);
    if (result.error && isSupabaseAuthConfigError(result.error.message)) {
      const service = createServiceRoleClient();
      result = await updateWith(service);
    }

    if (result.error) {
      return NextResponse.json(
        { error: "Unable to update title.", details: result.error.message },
        { status: 500 },
      );
    }
    if (!result.data) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({ conversation: result.data }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Unable to update title.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
