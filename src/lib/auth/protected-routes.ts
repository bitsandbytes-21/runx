/** Pages that need an account; the guest demo and runs stay public (FR-10). */
export const PROTECTED_PREFIXES = ["/editor"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function loginRedirectFor(
  pathname: string,
  isSignedIn: boolean,
): string | null {
  if (isSignedIn || !isProtectedPath(pathname)) return null;
  return `/login?next=${encodeURIComponent(pathname)}`;
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
