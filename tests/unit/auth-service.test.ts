import { describe, expect, it, vi } from "vitest";
import { createAuthService, type AuthClient } from "@/lib/auth/auth-service";

function fakeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    signUp: vi.fn(async () => ({
      data: { user: { identities: [{}] }, session: { access_token: "t" } },
      error: null,
    })),
    signInWithPassword: vi.fn(async () => ({
      data: { session: { access_token: "t" } },
      error: null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

describe("createAuthService", () => {
  it("signs up and reports a signed-in session", async () => {
    const client = fakeClient();
    const result = await createAuthService(client).signUp({
      email: "a@b.co",
      password: "windmills",
    });
    expect(result).toEqual({ ok: true, needsConfirmation: false });
    expect(client.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "windmills",
    });
  });

  it("asks the user to confirm their email when no session comes back", async () => {
    const client = fakeClient({
      signUp: vi.fn(async () => ({
        data: { user: { identities: [{}] }, session: null },
        error: null,
      })),
    });
    expect(
      await createAuthService(client).signUp({
        email: "a@b.co",
        password: "windmills",
      }),
    ).toEqual({
      ok: true,
      needsConfirmation: true,
    });
  });

  it("reports a duplicate email, also when Supabase hides it behind an empty identity list", async () => {
    const hidden = fakeClient({
      signUp: vi.fn(async () => ({
        data: { user: { identities: [] }, session: null },
        error: null,
      })),
    });
    expect(
      await createAuthService(hidden).signUp({
        email: "a@b.co",
        password: "windmills",
      }),
    ).toEqual({
      ok: false,
      message: "An account with this email already exists",
    });
    const explicit = fakeClient({
      signUp: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      })),
    });
    expect(
      await createAuthService(explicit).signUp({
        email: "a@b.co",
        password: "windmills",
      }),
    ).toMatchObject({
      ok: false,
      message: "An account with this email already exists",
    });
  });

  it("reports a wrong password on log in", async () => {
    const client = fakeClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      })),
    });
    expect(
      await createAuthService(client).logIn({
        email: "a@b.co",
        password: "wrongpass",
      }),
    ).toEqual({
      ok: false,
      message: "Wrong email or password",
    });
  });

  it("never sends empty input to the server", async () => {
    const client = fakeClient();
    const result = await createAuthService(client).logIn({
      email: "",
      password: "",
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { email: "Enter your email" },
    });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("logs out", async () => {
    const client = fakeClient();
    expect(await createAuthService(client).logOut()).toEqual({ ok: true });
    expect(client.signOut).toHaveBeenCalledOnce();
  });
});
