import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen } from "@/components/LoginScreen";
import type { AuthService } from "@/lib/auth/auth-service";

function service(overrides: Partial<AuthService> = {}): AuthService {
  return {
    logIn: vi.fn(async () => ({ ok: true as const })),
    signUp: vi.fn(async () => ({
      ok: true as const,
      needsConfirmation: false,
    })),
    logOut: vi.fn(async () => ({ ok: true as const })),
    ...overrides,
  };
}

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

describe("LoginScreen", () => {
  it("logs in and reports success", async () => {
    const auth = service();
    const onSuccess = vi.fn();
    render(<LoginScreen auth={auth} onSuccess={onSuccess} />);
    fill("a@b.co", "windmills");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(auth.logIn).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "windmills",
    });
  });

  it("shows field errors for empty input", async () => {
    const auth = service({
      logIn: vi.fn(async () => ({
        ok: false as const,
        fieldErrors: { email: "Enter your email" },
      })),
    });
    render(<LoginScreen auth={auth} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a wrong password as an alert", async () => {
    const auth = service({
      logIn: vi.fn(async () => ({
        ok: false as const,
        message: "Wrong email or password",
      })),
    });
    render(<LoginScreen auth={auth} onSuccess={vi.fn()} />);
    fill("a@b.co", "nope-nope");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wrong email or password",
    );
  });

  it("signs up, and asks to confirm the email when needed", async () => {
    const auth = service({
      signUp: vi.fn(async () => ({
        ok: true as const,
        needsConfirmation: true,
      })),
    });
    const onSuccess = vi.fn();
    render(<LoginScreen auth={auth} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("radio", { name: "Sign up" }));
    fill("a@b.co", "windmills");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/Check your email/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("explains when accounts are not set up on this deployment", () => {
    render(<LoginScreen auth={null} onSuccess={vi.fn()} />);
    expect(screen.getByText(/Accounts are not set up/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Log in" }),
    ).not.toBeInTheDocument();
  });
});
