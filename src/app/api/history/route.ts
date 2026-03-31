import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authState = await auth();
  if (!authState.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 12;

  try {
    const runQuery = async (
      client:
        | Awaited<ReturnType<typeof createClerkSupabaseClient>>
        | ReturnType<typeof createServiceRoleClient>,
    ) =>
      client
      .from("conversations")
      .select("id,title,agent_type,updated_at,last_message_at")
      .eq("user_id", authState.userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    const supabase = await createClerkSupabaseClient();
    let { data, error } = await runQuery(supabase);

    if (
      error &&
      /No suitable key|wrong key type|JWT|invalid signature|auth/i.test(
        error.message,
      )
    ) {
      // Fallback path for partially-configured Clerk<->Supabase token integration.
      const service = createServiceRoleClient();
      const fallback = await runQuery(service);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json(
        { error: "Unable to load history.", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { items: data ?? [] },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Unable to load history.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
