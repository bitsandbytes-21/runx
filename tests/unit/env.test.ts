import { describe, expect, it } from "vitest";
import { readSupabaseConfig } from "@/lib/env";

describe("readSupabaseConfig", () => {
  it("returns the config when both variables are valid", () => {
    expect(
      readSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toEqual({ url: "https://x.supabase.co", anonKey: "anon" });
  });

  it("returns null when accounts are not configured or the URL is invalid", () => {
    expect(readSupabaseConfig({})).toBeNull();
    expect(
      readSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "not a url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toBeNull();
  });
});
