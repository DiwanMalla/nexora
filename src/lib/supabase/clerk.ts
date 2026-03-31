import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * User-scoped Supabase client authenticated by Clerk session token.
 * RLS uses auth.jwt()->>'sub' (Clerk user id).
 */
export async function createClerkSupabaseClient() {
  const authState = await auth();

  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      accessToken: async () => (await authState.getToken()) ?? null,
    },
  );
}
