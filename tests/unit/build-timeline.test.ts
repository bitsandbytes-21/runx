import { describe, expect, it } from "vitest";
import { buildTimeline, type Timeline } from "@/lib/scheduler/build-timeline";
import {
  CLIMAX_WINDOW_SEC,
  END_TOLERANCE_SEC,
  LONG_GAP_SEC,
  MIN_GAP_SEC,
} from "@/lib/scheduler/constants";
import type { CheckpointId, Manifest } from "@/lib/manifest/schema";
import { makeManifest } from "../fixtures/manifest-fixture";

type FittedTimeline = Extract<Timeline, { ok: true }>;

function fitted(timeline: Timeline): FittedTimeline {
  if (!timeline.ok) throw new Error("expected a timeline that fits");
  return timeline;
}

function endOf(entry: { startSec: number; durationSec: number }): number {
  return entry.startSec + entry.durationSec;
}

const manifest = makeManifest();
const sceneOrder = new Map(manifest.scenes.map((s) => [s.id, s.order]));

describe("buildTimeline", () => {
  describe.each([20, 30, 45])("for a %i minute run", (durationMin) => {
    const timeline = fitted(buildTimeline(manifest, durationMin, null));
    const durationSec = durationMin * 60;

    it("ends within the tolerance of the chosen length", () => {
      const last = timeline.entries.at(-1)!;
      expect(Math.abs(endOf(last) - durationSec)).toBeLessThanOrEqual(
        END_TOLERANCE_SEC,
      );
      expect(timeline.endSec).toBe(endOf(last));
    });

    it("starts the climax within the last 3 minutes", () => {
      const climax = timeline.entries.find((e) => e.type === "climax")!;
      expect(climax.startSec).toBeGreaterThanOrEqual(
        durationSec - CLIMAX_WINDOW_SEC,
      );
    });

    it("has no overlaps, no negative times and nothing past the end", () => {
      timeline.entries.forEach((entry, index) => {
        expect(entry.startSec).toBeGreaterThanOrEqual(0);
        expect(entry.durationSec).toBeGreaterThan(0);
        expect(endOf(entry)).toBeLessThanOrEqual(durationSec);
        const next = timeline.entries[index + 1];
        if (next) {
          expect(next.startSec - endOf(entry)).toBeGreaterThanOrEqual(
            MIN_GAP_SEC - 1e-9,
          );
        }
      });
    });

    it("plays every scene after its prerequisites", () => {
      const played = new Set<string>();
      for (const entry of timeline.entries) {
        const scene = manifest.scenes.find((s) => s.id === entry.sceneId)!;
        for (const prerequisite of scene.prerequisites) {
          expect(played.has(prerequisite)).toBe(true);
        }
        played.add(entry.sceneId);
      }
    });

    it("keeps story scenes in story order and starts with the opening", () => {
      const story = timeline.entries.filter((e) => e.beat !== "encourage");
      const orders = story.map((e) => sceneOrder.get(e.sceneId)!);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(timeline.entries[0].type).toBe("opening");
      expect(timeline.entries.at(-1)!.type).toBe("ending");
    });

    it("never schedules sign-off, recap or compressed endings", () => {
      const types = timeline.entries.map((e) => e.type);
      expect(types).not.toContain("signoff");
      expect(types).not.toContain("recap");
      expect(types).not.toContain("compressed_ending");
    });

    it("places one encouragement near the middle of the run", () => {
      const encouragements = timeline.entries.filter(
        (e) => e.beat === "encourage",
      );
      expect(encouragements.length).toBeGreaterThanOrEqual(1);
      const middle = durationSec * 0.475;
      expect(Math.abs(encouragements[0].startSec - middle)).toBeLessThan(
        durationSec * 0.15,
      );
    });
  });

  it("adds a second encouragement at about 70% for 30 and 45 minute runs", () => {
    for (const durationMin of [30, 45]) {
      const timeline = fitted(buildTimeline(manifest, durationMin, null));
      const pushes = timeline.entries.filter((e) => e.beat === "encourage");
      expect(pushes).toHaveLength(2);
      expect(pushes[0].sceneId).not.toBe(pushes[1].sceneId);
      expect(pushes[1].startSec).toBeGreaterThan(pushes[0].startSec);
    }
    const short = fitted(buildTimeline(manifest, 20, null));
    expect(short.entries.filter((e) => e.beat === "encourage")).toHaveLength(1);
  });

  it("returns deeply equal output for identical input", () => {
    expect(buildTimeline(manifest, 30, "CP1")).toEqual(
      buildTimeline(manifest, 30, "CP1"),
    );
  });

  it("does not change the manifest it is given", () => {
    const copy = structuredClone(manifest);
    buildTimeline(copy, 45, "CP2", { includeRecap: true });
    expect(copy).toEqual(manifest);
  });

  it("drops optional scenes before required ones when time is short", () => {
    const tight = fitted(buildTimeline(manifest, 6, null));
    const ids = tight.entries.map((e) => e.sceneId);
    for (const required of ["s01", "s03", "s05", "s06", "s07"]) {
      expect(ids).toContain(required);
    }
    expect(ids).not.toContain("s02");
    expect(ids).not.toContain("s04");
    const roomy = fitted(buildTimeline(manifest, 30, null));
    expect(roomy.entries.map((e) => e.sceneId)).toEqual(
      expect.arrayContaining(["s02", "s04"]),
    );
  });

  it("drops the later optional scene first", () => {
    const timeline = fitted(buildTimeline(manifest, 7, null));
    const ids = timeline.entries.map((e) => e.sceneId);
    expect(ids).toContain("s02");
    expect(ids).not.toContain("s04");
  });

  describe("from a checkpoint", () => {
    it.each<[CheckpointId, string[]]>([
      ["CP1", ["s01"]],
      ["CP2", ["s01", "s02", "s03"]],
      ["CP3", ["s01", "s02", "s03", "s04", "s05"]],
    ])(
      "does not replay scenes up to %s and skips no required scene after it",
      (checkpoint, played) => {
        const timeline = fitted(buildTimeline(manifest, 20, checkpoint));
        const ids = timeline.entries.map((e) => e.sceneId);
        for (const id of played) expect(ids).not.toContain(id);
        const checkpointOrder = manifest.scenes.find(
          (s) => s.checkpoint === checkpoint,
        )!.order;
        const requiredAfter = manifest.scenes.filter(
          (s) =>
            s.required &&
            s.order > checkpointOrder &&
            ["core", "climax", "ending"].includes(s.type),
        );
        for (const scene of requiredAfter) expect(ids).toContain(scene.id);
        expect(timeline.startCheckpoint).toBe(checkpoint);
      },
    );

    it("starts with the recap for that checkpoint when asked", () => {
      const timeline = fitted(
        buildTimeline(manifest, 20, "CP2", { includeRecap: true }),
      );
      expect(timeline.entries[0]).toMatchObject({
        sceneId: "r02",
        type: "recap",
        startSec: 0,
      });
    });

    it("never adds a recap to a fresh start", () => {
      const timeline = fitted(
        buildTimeline(manifest, 20, null, { includeRecap: true }),
      );
      expect(timeline.entries.map((e) => e.type)).not.toContain("recap");
    });

    it("still lands the ending on time", () => {
      const timeline = fitted(buildTimeline(manifest, 45, "CP3"));
      expect(Math.abs(timeline.endSec - 45 * 60)).toBeLessThanOrEqual(
        END_TOLERANCE_SEC,
      );
    });
  });

  describe("when the story does not fit", () => {
    it("reports doesNotFit with the shortest workable length", () => {
      const result = buildTimeline(manifest, 5, null);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("doesNotFit");
      expect(result.minDurationMin).toBeGreaterThan(5);
      expect(buildTimeline(manifest, result.minDurationMin, null).ok).toBe(
        true,
      );
      expect(buildTimeline(manifest, result.minDurationMin - 1, null).ok).toBe(
        false,
      );
    });

    it("needs less time from a later checkpoint", () => {
      const fresh = buildTimeline(manifest, 1, null);
      const late = buildTimeline(manifest, 1, "CP3");
      if (fresh.ok || late.ok) throw new Error("expected doesNotFit");
      expect(late.minDurationMin).toBeLessThan(fresh.minDurationMin);
    });
  });

  describe("bridge lines", () => {
    it("adds a bridge before a long silence", () => {
      const timeline = fitted(buildTimeline(manifest, 45, null));
      const opening = timeline.entries[0];
      const next = timeline.entries[1];
      expect(opening.includeBridge).toBe(true);
      expect(next.startSec - endOf(opening)).toBeGreaterThanOrEqual(
        LONG_GAP_SEC,
      );
      // the bridge is part of the scene's scheduled time
      expect(opening.durationSec).toBe(60 + 4);
    });

    it("leaves the bridge out when the silence is short", () => {
      const timeline = fitted(buildTimeline(manifest, 6, null));
      expect(timeline.entries.every((e) => !e.includeBridge)).toBe(true);
    });
  });

  it("works with sparse content: no optional scenes and no encouragement", () => {
    const sparse: Manifest = {
      ...manifest,
      scenes: manifest.scenes.filter((s) => s.type !== "optional"),
    };
    const timeline = fitted(buildTimeline(sparse, 20, null));
    expect(timeline.entries.map((e) => e.sceneId)).toEqual([
      "s01",
      "s03",
      "s05",
      "s06",
      "s07",
    ]);
  });

  it("rejects a length that is not a positive number of minutes", () => {
    expect(() => buildTimeline(manifest, 0, null)).toThrow(RangeError);
    expect(() => buildTimeline(manifest, Number.NaN, null)).toThrow(RangeError);
  });

  it("rejects a checkpoint the manifest does not have", () => {
    const noCp3: Manifest = {
      ...manifest,
      scenes: manifest.scenes.map((s) =>
        s.checkpoint === "CP3" ? { ...s, checkpoint: null } : s,
      ),
    };
    expect(() => buildTimeline(noCp3, 20, "CP3")).toThrow(/CP3/);
  });
});
