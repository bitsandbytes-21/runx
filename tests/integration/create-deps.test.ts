import { describe, expect, it } from "vitest";
import { createApiDeps } from "@/lib/api/create-deps";

describe("createApiDeps without Supabase configured", () => {
  it("serves the bundled episode and treats every caller as signed out", async () => {
    const deps = createApiDeps();
    expect(
      (await deps.episodes.listPublished()).map((m) => m.episodeId),
    ).toEqual(["ep1"]);
    expect(await deps.episodes.getPublished("ep9")).toBeNull();
    expect(
      await deps.authenticate(new Request("http://localhost/api/me")),
    ).toBeNull();
  });
});
