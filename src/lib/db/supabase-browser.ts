import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

let client: SupabaseClient | null | undefined;

/** One browser client (session in cookies so the server can read it); null when not configured. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = getSupabaseConfig();
  client = config ? createBrowserClient(config.url, config.anonKey) : null;
  return client;
}
