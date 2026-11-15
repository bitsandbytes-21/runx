import { describe, expect, it } from "vitest";
import { checkHealth } from "@/lib/api/health";
import { fakeDeps } from "../fixtures/api-fakes";

describe("GET /api/health", () => {
  it("reports ok without a database configured", async () => {
    const response = await checkHealth(fakeDeps().deps, false);
    expect(await response.json()).toEqual({
      status: "ok",
      database: "not_configured",
    });
  });

  it("checks the database when configured", async () => {
    const response = await checkHealth(fakeDeps().deps, true);
    expect(response.status).toBe(200);
    expect((await response.json()).database).toBe("ok");
  });

  it("returns 503 when the database fails", async () => {
    const { deps } = fakeDeps();
    deps.episodes.listPublished = async () => {
      throw new Error("down");
    };
    const response = await checkHealth(deps, true);
    expect(response.status).toBe(503);
  });
});

describe("GET /api/me", () => {
  it("returns the caller's role", async () => {
    const { getMe } = await import("@/lib/api/handlers");
    const { request } = await import("../fixtures/api-fakes");
    const response = await getMe(
      fakeDeps().deps,
      request("/api/me", { token: "token-editor" }),
    );
    expect(await response.json()).toEqual({
      userId: "token-editor",
      role: "editor",
    });
  });
});
