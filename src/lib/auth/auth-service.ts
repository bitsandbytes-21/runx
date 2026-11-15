import {
  authErrorMessage,
  validateCredentials,
  type Credentials,
  type FieldErrors,
} from "./credentials";

/** The slice of the Supabase Auth client we use, so tests can fake it. */
export interface AuthClient {
  signUp: (credentials: Credentials) => Promise<{
    data: { user: { identities?: unknown[] } | null; session: unknown };
    error: { message: string } | null;
  }>;
  signInWithPassword: (
    credentials: Credentials,
  ) => Promise<{
    data: { session: unknown };
    error: { message: string } | null;
  }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
}

export type AuthFailure = {
  ok: false;
  message?: string;
  fieldErrors?: FieldErrors;
};

export interface AuthService {
  signUp: (
    credentials: Credentials,
  ) => Promise<{ ok: true; needsConfirmation: boolean } | AuthFailure>;
  logIn: (credentials: Credentials) => Promise<{ ok: true } | AuthFailure>;
  logOut: () => Promise<{ ok: true } | AuthFailure>;
}

const DUPLICATE_EMAIL = "An account with this email already exists";

export function createAuthService(client: AuthClient): AuthService {
  return {
    async signUp(input) {
      const checked = validateCredentials(input);
      if (!checked.ok) return { ok: false, fieldErrors: checked.fieldErrors };
      const { data, error } = await client.signUp({
        email: checked.email,
        password: checked.password,
      });
      if (error) return { ok: false, message: authErrorMessage(error) };
      // With email confirmation on, Supabase hides duplicates as a user with no identities.
      if (data.user && data.user.identities?.length === 0)
        return { ok: false, message: DUPLICATE_EMAIL };
      return { ok: true, needsConfirmation: !data.session };
    },
    async logIn(input) {
      const checked = validateCredentials(input);
      if (!checked.ok) return { ok: false, fieldErrors: checked.fieldErrors };
      const { error } = await client.signInWithPassword({
        email: checked.email,
        password: checked.password,
      });
      return error
        ? { ok: false, message: authErrorMessage(error) }
        : { ok: true };
    },
    async logOut() {
      const { error } = await client.signOut();
      return error
        ? { ok: false, message: authErrorMessage(error) }
        : { ok: true };
    },
  };
}
