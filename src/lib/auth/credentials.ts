import { z } from "zod";

export interface Credentials {
  email: string;
  password: string;
}

export type FieldErrors = Partial<Record<keyof Credentials, string>>;

export type CredentialCheck =
  ({ ok: true } & Credentials) | { ok: false; fieldErrors: FieldErrors };

export const MIN_PASSWORD_LENGTH = 8;

const CredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("Enter a valid email")),
  password: z
    .string()
    .min(1, "Enter your password")
    .min(MIN_PASSWORD_LENGTH, "Use at least 8 characters"),
});

export function validateCredentials(input: Credentials): CredentialCheck {
  const parsed = CredentialsSchema.safeParse(input);
  if (parsed.success) return { ok: true, ...parsed.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof Credentials;
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}

const KNOWN_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, "Wrong email or password"],
  [
    /already registered|already exists/i,
    "An account with this email already exists",
  ],
  [
    /email not confirmed/i,
    "Confirm your email first, using the link we sent you",
  ],
  [/rate limit|too many/i, "Too many attempts. Wait a minute and try again."],
];

/** Maps Supabase Auth errors to plain messages; never echoes the password. */
export function authErrorMessage(error: { message: string }): string {
  return (
    KNOWN_ERRORS.find(([pattern]) => pattern.test(error.message))?.[1] ??
    "Something went wrong. Please try again."
  );
}
