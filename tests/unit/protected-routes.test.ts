import { describe, expect, it } from "vitest";
import { loginRedirectFor } from "@/lib/auth/protected-routes";

describe("loginRedirectFor", () => {
  it("sends anonymous visitors of protected pages to login with a return path", () => {
    expect(loginRedirectFor("/editor", false)).toBe("/login?next=%2Feditor");
    expect(loginRedirectFor("/editor/scenes", false)).toBe(
      "/login?next=%2Feditor%2Fscenes",
    );
  });

  it("lets signed-in users through", () => {
    expect(loginRedirectFor("/editor", true)).toBeNull();
  });

  it("keeps public pages and the guest demo open", () => {
    for (const path of ["/", "/run", "/resume", "/login", "/api/episodes"]) {
      expect(loginRedirectFor(path, false)).toBeNull();
    }
  });
});
