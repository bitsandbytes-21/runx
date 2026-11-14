import { describe, expect, it } from "vitest";
import {
  planResume,
  recapPreview,
  RECAP_GAP_DAYS,
  shouldOfferRecap,
} from "@/lib/progress/resume";
import { makeManifest } from "../fixtures/manifest-fixture";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 14, 12);

describe("shouldOfferRecap", () => {
  it("offers the recap only after a gap of at least 3 days", () => {
    expect(RECAP_GAP_DAYS).toBe(3);
    expect(
      shouldOfferRecap(new Date(NOW - 3 * DAY_MS).toISOString(), NOW),
    ).toBe(true);
    expect(
      shouldOfferRecap(new Date(NOW - 2.9 * DAY_MS).toISOString(), NOW),
    ).toBe(false);
  });

  it("never offers it on an immediate continuation or a bad date", () => {
    expect(shouldOfferRecap(new Date(NOW - 60_000).toISOString(), NOW)).toBe(
      false,
    );
    expect(shouldOfferRecap("not a date", NOW)).toBe(false);
  });
});

describe("planResume", () => {
  const manifest = makeManifest();

  it("builds the timeline from the checkpoint when it fits", () => {
    const plan = planResume(manifest, "CP2", 20, false);
    expect(plan.kind).toBe("fits");
    if (plan.kind === "fits") expect(plan.timeline.startCheckpoint).toBe("CP2");
  });

  it("explains a length that is too short and suggests the next allowed one", () => {
    const tiny = {
      ...manifest,
      scenes: manifest.scenes.map((s) =>
        s.id === "s05" ? { ...s, durationSec: 1000 } : s,
      ),
    };
    const plan = planResume(tiny, "CP2", 15, false);
    expect(plan).toMatchObject({
      kind: "tooShort",
      minDurationMin: 22,
      suggestedDurationMin: 25,
    });
  });
});

describe("recapPreview", () => {
  it("returns the first two recap lines for the checkpoint", () => {
    const lines = recapPreview(makeManifest(), "CP3");
    expect(lines.map((l) => l.id)).toEqual(["r03-01", "r03-02"]);
  });
});
