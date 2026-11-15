import { describe, expect, it } from "vitest";
import { sessionClipUrls } from "@/lib/run/session-clips";
import { buildTimeline } from "@/lib/scheduler/build-timeline";
import { makeManifest } from "../fixtures/manifest-fixture";

describe("sessionClipUrls", () => {
  it("lists the timeline lines plus sign-off and compressed endings, once each", () => {
    const manifest = makeManifest();
    const timeline = buildTimeline(manifest, 6, null);
    if (!timeline.ok) throw new Error();
    const urls = sessionClipUrls(manifest, timeline);
    expect(urls).toContain("/audio/test/s01-1.m4a");
    expect(urls).toContain("/audio/test/x01-1.m4a");
    expect(urls).toContain("/audio/test/c03-2.m4a");
    expect(urls).not.toContain("/audio/test/r01-1.m4a");
    expect(new Set(urls).size).toBe(urls.length);
  });
});
