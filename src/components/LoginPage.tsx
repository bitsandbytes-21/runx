"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoginScreen } from "./LoginScreen";
import { createAuthService, type AuthClient } from "@/lib/auth/auth-service";
import { safeNextPath } from "@/lib/auth/protected-routes";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";

export function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [auth] = useState(() => {
    const supabase = getBrowserSupabase();
    // Bound methods: the Supabase auth client relies on `this`.
    const client: AuthClient | null = supabase && {
      signUp: (credentials) => supabase.auth.signUp(credentials),
      signInWithPassword: (credentials) =>
        supabase.auth.signInWithPassword(credentials),
      signOut: () => supabase.auth.signOut(),
    };
    return client && createAuthService(client);
  });
  return (
    <LoginScreen
      auth={auth}
      onSuccess={() => {
        router.push(safeNextPath(params.get("next")));
        router.refresh();
      }}
    />
  );
}
