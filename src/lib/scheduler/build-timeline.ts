import {
  isEncouragement,
  isStoryScene,
  type Beat,
  type CheckpointId,
  type Manifest,
  type Scene,
  type SceneType,
  type StoryPart,
} from "@/lib/manifest/schema";
import {
  LONG_GAP_SEC,
  MIDPOINT_SHARE,
  MIN_GAP_SEC,
  SECOND_PUSH_MIN_DURATION_SEC,
  SECOND_PUSH_SHARE,
} from "./constants";

export interface TimelineEntry {
  sceneId: string;
  type: SceneType;
  part: StoryPart;
  beat: Beat | null;
  startSec: number;
  /** Includes the bridge line when `includeBridge` is true. */
  durationSec: number;
  includeBridge: boolean;
  /** Checkpoint reached once this entry has fully played. */
  checkpoint: CheckpointId | null;
}

export type Timeline =
  | {
      ok: true;
      durationSec: number;
      startCheckpoint: CheckpointId | null;
      entries: TimelineEntry[];
      endSec: number;
    }
  | {
      ok: false;
      reason: "doesNotFit";
      durationSec: number;
      startCheckpoint: CheckpointId | null;
      /** Shortest whole-minute length that fits the remaining required story. */
      minDurationMin: number;
    };

export interface BuildTimelineOptions {
  /** Start with the "previously on" recap for the checkpoint (after a long gap). */
  includeRecap?: boolean;
}

// Rounding keeps floating-point noise out of times shown to people and tests.
function round(sec: number): number {
  return Math.round(sec * 100) / 100;
}

function sumDurations(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.durationSec, 0);
}

/** Seconds a sequence of scenes needs when each one is followed by a minimum gap. */
function packedSec(scenes: Scene[]): number {
  return sumDurations(scenes) + scenes.length * MIN_GAP_SEC;
}

function remainingStory(
  manifest: Manifest,
  checkpoint: CheckpointId | null,
): Scene[] {
  const story = manifest.scenes
    .filter(isStoryScene)
    .sort((a, b) => a.order - b.order);
  if (checkpoint === null) return story;
  const index = story.findIndex((scene) => scene.checkpoint === checkpoint);
  if (index === -1) {
    throw new RangeError(`Checkpoint ${checkpoint} is not in this manifest`);
  }
  return story.slice(index + 1);
}

/** Even gaps after every item; the climax block starts at `windowEndSec`. */
function layOut(items: Scene[], windowEndSec: number): number[] {
  const gap = (windowEndSec - sumDurations(items)) / items.length;
  const starts: number[] = [];
  let cursor = 0;
  for (const item of items) {
    starts.push(cursor);
    cursor += item.durationSec + gap;
  }
  return starts;
}

/** Inserts `push` at the position whose start is closest to `targetSec`. */
function insertNear(
  items: Scene[],
  push: Scene,
  targetSec: number,
  windowEndSec: number,
  minIndex: number,
): { items: Scene[]; index: number } {
  let best = { items, index: -1, distance: Number.POSITIVE_INFINITY };
  for (let index = Math.max(minIndex, 1); index <= items.length; index++) {
    const candidate = [...items.slice(0, index), push, ...items.slice(index)];
    const distance = Math.abs(
      layOut(candidate, windowEndSec)[index] - targetSec,
    );
    if (distance < best.distance) best = { items: candidate, index, distance };
  }
  return best;
}

/**
 * Fits the episode into a run of `durationMin` minutes, starting after
 * `checkpoint` (null for a fresh start). Pure: same input, same output.
 */
export function buildTimeline(
  manifest: Manifest,
  durationMin: number,
  checkpoint: CheckpointId | null,
  options: BuildTimelineOptions = {},
): Timeline {
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    throw new RangeError(`Run length must be positive, got ${durationMin}`);
  }
  const durationSec = durationMin * 60;
  const remaining = remainingStory(manifest, checkpoint);
  const climax = remaining.find((scene) => scene.type === "climax");
  const ending = remaining.find((scene) => scene.type === "ending");
  if (!climax || !ending) {
    throw new RangeError("The remaining story has no climax and ending");
  }

  const recap =
    options.includeRecap && checkpoint !== null
      ? manifest.scenes.find(
          (s) => s.type === "recap" && s.forCheckpoint === checkpoint,
        )
      : undefined;
  const before = remaining.filter((s) => s !== climax && s !== ending);
  const required = before.filter((scene) => scene.required);
  const lead = recap ? [recap] : [];

  // The ending finishes exactly at the end of the run; the climax just before it.
  const endingStartSec = durationSec - ending.durationSec;
  const climaxStartSec = endingStartSec - MIN_GAP_SEC - climax.durationSec;

  const requiredSec =
    packedSec([...lead, ...required]) +
    climax.durationSec +
    MIN_GAP_SEC +
    ending.durationSec;
  if (requiredSec > durationSec) {
    return {
      ok: false,
      reason: "doesNotFit",
      durationSec,
      startCheckpoint: checkpoint,
      minDurationMin: Math.ceil(requiredSec / 60),
    };
  }

  // Encouragements rotate with the checkpoint so a resumed run hears new ones.
  const pushPool = manifest.scenes
    .filter(isEncouragement)
    .sort((a, b) => a.order - b.order);
  const rotation = checkpoint === null ? 0 : Number(checkpoint.slice(2));
  const pushCount = durationSec >= SECOND_PUSH_MIN_DURATION_SEC ? 2 : 1;
  const pushes = Array.from(
    { length: Math.min(pushCount, pushPool.length) },
    (_, index) => pushPool[(rotation + index) % pushPool.length],
  );

  // Drop priority: optional story scenes (latest first), then the second
  // push, then the midpoint push. Required scenes are never dropped.
  let optional = before.filter((scene) => !scene.required);
  const fits = (story: Scene[], pushList: Scene[]) =>
    packedSec([...lead, ...story, ...pushList]) <= climaxStartSec;
  const storyWith = (chosen: Scene[]) =>
    before.filter((scene) => scene.required || chosen.includes(scene));
  let chosenPushes = pushes;
  while (optional.length > 0 && !fits(storyWith(optional), chosenPushes)) {
    optional = optional.slice(0, -1);
  }
  while (chosenPushes.length > 0 && !fits(storyWith(optional), chosenPushes)) {
    chosenPushes = chosenPushes.slice(0, -1);
  }

  let items = [...lead, ...storyWith(optional)];
  let lastPushIndex = 0;
  const targets = [MIDPOINT_SHARE, SECOND_PUSH_SHARE];
  chosenPushes.forEach((push, index) => {
    const placed = insertNear(
      items,
      push,
      targets[index] * durationSec,
      climaxStartSec,
      lastPushIndex + 1,
    );
    items = placed.items;
    lastPushIndex = placed.index;
  });

  const starts = layOut(items, climaxStartSec);
  const entries: TimelineEntry[] = items.map((scene, index) => {
    const startSec = starts[index];
    const nextStartSec = starts[index + 1] ?? climaxStartSec;
    const silenceSec = nextStartSec - startSec - scene.durationSec;
    const includeBridge =
      scene.bridge !== null &&
      silenceSec - scene.bridge.durationSec >= LONG_GAP_SEC;
    return toEntry(scene, startSec, includeBridge);
  });
  entries.push(toEntry(climax, climaxStartSec, false));
  entries.push(toEntry(ending, endingStartSec, false));

  return {
    ok: true,
    durationSec,
    startCheckpoint: checkpoint,
    entries,
    endSec: round(
      entries[entries.length - 1].startSec +
        entries[entries.length - 1].durationSec,
    ),
  };
}

function toEntry(
  scene: Scene,
  startSec: number,
  includeBridge: boolean,
): TimelineEntry {
  const bridgeSec =
    includeBridge && scene.bridge ? scene.bridge.durationSec : 0;
  return {
    sceneId: scene.id,
    type: scene.type,
    part: scene.part,
    beat: scene.beat,
    startSec: round(startSec),
    durationSec: round(scene.durationSec + bridgeSec),
    includeBridge,
    checkpoint: scene.checkpoint,
  };
}
