import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectFor } from "@/lib/auth/protected-routes";
import { getSupabaseConfig } from "@/lib/env";

// Optimistic check only: the editor API routes verify the role again on the server.
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  let isSignedIn = false;
  if (config) {
    const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    isSignedIn = data.user !== null;
  }
  const redirect = loginRedirectFor(request.nextUrl.pathname, isSignedIn);
  return redirect
    ? NextResponse.redirect(new URL(redirect, request.url))
    : response;
}

export const config = {
  matcher: ["/editor/:path*"],
};
