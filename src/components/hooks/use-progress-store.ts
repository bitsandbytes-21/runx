"use client";

import { useMemo } from "react";
import { useAuth } from "./use-auth";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { createApiProgressStore } from "@/lib/progress/api-progress-store";
import {
  browserStorage,
  createLocalProgressStore,
  DEMO_PROGRESS_KEY,
  GUEST_PROGRESS_KEY,
} from "@/lib/progress/local-progress-store";
import type { ProgressStore } from "@/lib/progress/progress-record";

async function currentToken(): Promise<string> {
  const { data } = (await getBrowserSupabase()?.auth.getSession()) ?? {
    data: { session: null },
  };
  if (!data.session)
    throw new Error("You were signed out; log in again to save progress");
  return data.session.access_token;
}

export function guestProgressStore(): ProgressStore {
  return createLocalProgressStore(browserStorage(), GUEST_PROGRESS_KEY);
}

/**
 * Where progress lives: the database for signed-in runners, this device for
 * guests, and a separate key for the demo so it never overwrites real progress.
 * Null while the session is still being read.
 */
export function useProgressStore(
  mode: "run" | "demo" = "run",
): ProgressStore | null {
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.userId : null;
  return useMemo(() => {
    if (mode === "demo")
      return createLocalProgressStore(browserStorage(), DEMO_PROGRESS_KEY);
    if (auth.status === "loading") return null;
    if (userId) return createApiProgressStore({ getToken: currentToken });
    return guestProgressStore();
  }, [mode, auth.status, userId]);
}
