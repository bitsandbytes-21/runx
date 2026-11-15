"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  GLASS_BUTTON,
  GLASS_CARD,
  LARGE_TITLE,
  PRIMARY_BUTTON,
  SCREEN,
} from "./styles";
import type { AuthService } from "@/lib/auth/auth-service";
import type { FieldErrors } from "@/lib/auth/credentials";

type Mode = "logIn" | "signUp";

interface LoginScreenProps {
  /** null when this deployment has no Supabase project configured. */
  auth: AuthService | null;
  onSuccess: () => void;
}

const FIELD =
  "min-h-tap w-full rounded-group bg-tint-bg px-4 text-headline text-label aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-error";

export function LoginScreen({ auth, onSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("logIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!auth) {
    return (
      <main className={SCREEN}>
        <h1 className={LARGE_TITLE}>Log in</h1>
        <p className={GLASS_CARD}>
          Accounts are not set up on this deployment yet. You can still run as a
          guest; progress stays on this device.
        </p>
        <Link href="/" className={GLASS_BUTTON}>
          Back to Home
        </Link>
      </main>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setIsBusy(true);
    setMessage(null);
    setNotice(null);
    const credentials = { email, password };
    const result =
      mode === "logIn"
        ? await auth.logIn(credentials)
        : await auth.signUp(credentials);
    setIsBusy(false);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.message ?? null);
      return;
    }
    setFieldErrors({});
    if ("needsConfirmation" in result && result.needsConfirmation) {
      setNotice(
        "Check your email and open the link to confirm your account, then log in.",
      );
      return;
    }
    onSuccess();
  }

  return (
    <main className={SCREEN}>
      <h1 className={LARGE_TITLE}>{mode === "logIn" ? "Log in" : "Sign up"}</h1>
      <p className="text-footnote text-fg-2">
        An account keeps your place in the story on every device.
      </p>
      <div
        role="radiogroup"
        aria-label="Account"
        className="grid grid-cols-2 gap-1 rounded-pill bg-segment-track p-1"
      >
        {(
          [
            ["logIn", "Log in"],
            ["signUp", "Sign up"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-tap cursor-pointer items-center justify-center rounded-pill text-subhead font-semibold has-[:checked]:bg-tint-bg has-[:checked]:text-label"
          >
            <input
              type="radio"
              name="mode"
              className="sr-only"
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {label}
          </label>
        ))}
      </div>
      <form
        noValidate
        onSubmit={submit}
        className={`${GLASS_CARD} flex flex-col gap-3`}
      >
        <label className="flex flex-col gap-1 text-footnote">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={FIELD}
          />
        </label>
        {fieldErrors.email && (
          <p id="email-error" className="text-footnote text-error">
            {fieldErrors.email}
          </p>
        )}
        <label className="flex flex-col gap-1 text-footnote">
          Password
          <input
            type="password"
            autoComplete={
              mode === "logIn" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            className={FIELD}
          />
        </label>
        {fieldErrors.password && (
          <p id="password-error" className="text-footnote text-error">
            {fieldErrors.password}
          </p>
        )}
        {message && (
          <p role="alert" className="text-footnote text-error">
            {message}
          </p>
        )}
        {notice && (
          <p role="status" className="text-footnote">
            {notice}
          </p>
        )}
        <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy}>
          {mode === "logIn" ? "Log in" : "Create account"}
        </button>
      </form>
      <Link href="/" className="text-center text-footnote text-fg-2 underline">
        Continue as a guest
      </Link>
    </main>
  );
}
