import Link from "next/link";
import type { AuthState } from "./hooks/use-auth";

interface AccountRowProps {
  auth: AuthState;
  onLogOut: () => void;
}

export function AccountRow({ auth, onLogOut }: AccountRowProps) {
  if (auth.status === "unconfigured" || auth.status === "loading") return null;
  if (auth.status === "anonymous") {
    return (
      <p className="text-center text-footnote text-fg-2">
        <Link
          href="/login"
          className="inline-flex min-h-tap items-center font-semibold text-fg underline"
        >
          Log in or sign up
        </Link>{" "}
        to keep your progress on every device.
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-2 text-footnote text-fg-2">
      Signed in as {auth.email ?? "runner"}
      <button
        type="button"
        onClick={onLogOut}
        className="min-h-tap px-2 font-semibold text-fg underline"
      >
        Log out
      </button>
    </p>
  );
}
