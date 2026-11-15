import { describe, expect, it } from "vitest";
import { authErrorMessage, validateCredentials } from "@/lib/auth/credentials";

describe("validateCredentials", () => {
  it("accepts an email and a password of at least 8 characters", () => {
    expect(
      validateCredentials({
        email: " runner@example.com ",
        password: "windmills",
      }),
    ).toEqual({
      ok: true,
      email: "runner@example.com",
      password: "windmills",
    });
  });

  it("names each empty field", () => {
    expect(validateCredentials({ email: "", password: "" })).toEqual({
      ok: false,
      fieldErrors: {
        email: "Enter your email",
        password: "Enter your password",
      },
    });
  });

  it("rejects a malformed email and a short password", () => {
    expect(
      validateCredentials({ email: "rocinante", password: "short" }),
    ).toEqual({
      ok: false,
      fieldErrors: {
        email: "Enter a valid email",
        password: "Use at least 8 characters",
      },
    });
  });
});

describe("authErrorMessage", () => {
  it("explains a wrong password without saying which part was wrong", () => {
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe(
      "Wrong email or password",
    );
  });

  it("explains a duplicate email", () => {
    expect(authErrorMessage({ message: "User already registered" })).toBe(
      "An account with this email already exists",
    );
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ message: "fetch failed" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
