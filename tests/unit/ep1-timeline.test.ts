import { describe, expect, it } from "vitest";
import { EP1_MANIFEST } from "@/content/episodes";
import { buildTimeline } from "@/lib/scheduler/build-timeline";
import {
  CLIMAX_WINDOW_SEC,
  END_TOLERANCE_SEC,
} from "@/lib/scheduler/constants";
import type { CheckpointId } from "@/lib/manifest/schema";

const STARTS: (CheckpointId | null)[] = [null, "CP1", "CP2", "CP3"];

describe("Episode 1 timelines", () => {
  describe.each([15, 20, 25, 30, 45, 60])("for %i minutes", (durationMin) => {
    it.each(STARTS)(
      "fits from checkpoint %s with the climax at the end",
      (checkpoint) => {
        const timeline = buildTimeline(EP1_MANIFEST, durationMin, checkpoint, {
          includeRecap: checkpoint !== null,
        });
        if (!timeline.ok) throw new Error("expected Ep1 to fit");
        const durationSec = durationMin * 60;
        expect(Math.abs(timeline.endSec - durationSec)).toBeLessThanOrEqual(
          END_TOLERANCE_SEC,
        );
        const climax = timeline.entries.find((e) => e.type === "climax")!;
        expect(climax.startSec).toBeGreaterThanOrEqual(
          durationSec - CLIMAX_WINDOW_SEC,
        );
        expect(
          timeline.entries.filter((e) => e.beat === "encourage").length,
        ).toBeGreaterThanOrEqual(1);
      },
    );
  });

  it("includes every optional scene once there is room", () => {
    const timeline = buildTimeline(EP1_MANIFEST, 30, null);
    if (!timeline.ok) throw new Error("expected Ep1 to fit");
    const optional = EP1_MANIFEST.scenes.filter(
      (s) => s.type === "optional" && !s.beat,
    );
    for (const scene of optional) {
      expect(timeline.entries.map((e) => e.sceneId)).toContain(scene.id);
    }
  });
});
