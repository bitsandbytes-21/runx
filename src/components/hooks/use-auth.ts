"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { getSupabaseConfig } from "@/lib/env";

export type AuthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "signedIn";
      userId: string;
      email: string | null;
      accessToken: string;
    };

function fromSession(session: Session | null): AuthState {
  if (!session) return { status: "anonymous" };
  return {
    status: "signedIn",
    userId: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
  };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() =>
    getSupabaseConfig() ? { status: "loading" } : { status: "unconfigured" },
  );
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setState(fromSession(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState(fromSession(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}
