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
 * Service-role client for trusted server contexts only:
 * webhooks, background jobs, and admin maintenance.
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
