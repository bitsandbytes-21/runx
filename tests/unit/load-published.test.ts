import { describe, expect, it } from "vitest";
import { loadPublishedManifest } from "@/lib/manifest/load-published";
import { makeManifest } from "../fixtures/manifest-fixture";

const bundled = makeManifest();

describe("loadPublishedManifest", () => {
  it("uses the published manifest when it is valid", async () => {
    const published = { ...bundled, manifestVersion: 2 };
    const manifest = await loadPublishedManifest("ep1", bundled, async () =>
      Response.json(published),
    );
    expect(manifest.manifestVersion).toBe(2);
  });

  it("falls back to the bundled copy on errors or invalid data", async () => {
    expect(
      await loadPublishedManifest(
        "ep1",
        bundled,
        async () => new Response(null, { status: 500 }),
      ),
    ).toBe(bundled);
    expect(
      await loadPublishedManifest("ep1", bundled, async () =>
        Response.json({ broken: true }),
      ),
    ).toBe(bundled);
    expect(
      await loadPublishedManifest("ep1", bundled, async () => {
        throw new TypeError("offline");
      }),
    ).toBe(bundled);
  });
});
