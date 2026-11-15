import type { CheckpointId, Line, Manifest } from "@/lib/manifest/schema";
import { buildTimeline, type Timeline } from "@/lib/scheduler/build-timeline";
import { nextFittingDuration } from "@/lib/run/durations";

/** A guess from FR-06 (no evidence yet); calibrate in trial runs. */
export const RECAP_GAP_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function shouldOfferRecap(
  lastPlayedAtIso: string,
  nowMs: number,
  gapDays = RECAP_GAP_DAYS,
): boolean {
  const last = Date.parse(lastPlayedAtIso);
  return Number.isFinite(last) && nowMs - last >= gapDays * DAY_MS;
}

export type ResumePlan =
  | { kind: "fits"; timeline: Extract<Timeline, { ok: true }> }
  | {
      kind: "tooShort";
      minDurationMin: number;
      suggestedDurationMin: number | null;
    };

export function planResume(
  manifest: Manifest,
  checkpoint: CheckpointId | null,
  durationMin: number,
  includeRecap: boolean,
): ResumePlan {
  const timeline = buildTimeline(manifest, durationMin, checkpoint, {
    includeRecap,
  });
  if (timeline.ok) return { kind: "fits", timeline };
  return {
    kind: "tooShort",
    minDurationMin: timeline.minDurationMin,
    suggestedDurationMin: nextFittingDuration(timeline.minDurationMin),
  };
}

/** The first two recap lines, shown as the text recap on Home and Resume. */
export function recapPreview(
  manifest: Manifest,
  checkpoint: CheckpointId,
): Line[] {
  const recap = manifest.scenes.find(
    (s) => s.type === "recap" && s.forCheckpoint === checkpoint,
  );
  return recap ? recap.lines.slice(0, 2) : [];
}
