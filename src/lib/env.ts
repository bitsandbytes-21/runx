import { z } from "zod";

const SupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/** Validates env vars at the boundary; null means accounts are switched off. */
export function readSupabaseConfig(
  env: Record<string, string | undefined>,
): SupabaseConfig | null {
  const parsed = SupabaseEnvSchema.safeParse(env);
  if (!parsed.success) return null;
  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseConfig(): SupabaseConfig | null {
  // Named literally so Next.js inlines the public values into the browser bundle.
  return readSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
