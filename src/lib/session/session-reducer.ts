import {
  STORY_PARTS,
  type CheckpointId,
  type Line,
  type Manifest,
  type SceneType,
  type StoryPart,
} from "@/lib/manifest/schema";
import type { Timeline, TimelineEntry } from "@/lib/scheduler/build-timeline";

export interface PlannedEntry extends TimelineEntry {
  /** Lines to speak, including the bridge when the timeline asked for it. */
  lines: Line[];
}

export interface PlannedScene {
  sceneId: string;
  type: SceneType;
  part: StoryPart;
  lines: Line[];
}

export type SessionPhase =
  | "ready"
  | "playing"
  | "paused"
  | "stopSheet"
  /** A choice was made; the current line finishes before it takes effect. */
  | "closing"
  | "error"
  | "ended";

export type SessionTrack = "story" | "signoff" | "finishing";
export type StopChoice = "save" | "finish";
export type SessionOutcome = "complete" | "saved" | "incomplete";

export interface SessionState {
  phase: SessionPhase;
  track: SessionTrack;
  durationSec: number;
  clockSec: number;
  entries: PlannedEntry[];
  entryIndex: number;
  /** Equals the scene's line count while waiting in the silence after it. */
  lineIndex: number;
  special: PlannedScene | null;
  specialLineIndex: number;
  /** True while a line should be sounding (or finishing behind the sheet). */
  isLineActive: boolean;
  /** Bumped every time a line (re)starts, so the audio layer can react. */
  playCount: number;
  lastCheckpoint: CheckpointId | null;
  hasSaved: boolean;
  savedCheckpoint: CheckpointId | null;
  canFinishNow: boolean;
  isEpisodeComplete: boolean;
  hasSkippedLine: boolean;
  /** False once a line of the ending being played was skipped. */
  isEndingIntact: boolean;
  outcome: SessionOutcome | null;
  error: { lineId: string; message: string } | null;
  pendingChoice: StopChoice | null;
  /** Phase to return to after the Stop sheet or an error. */
  returnPhase: "playing" | "paused" | "error" | "closing";
  signoff: PlannedScene | null;
  compressedEndings: Partial<Record<CheckpointId, PlannedScene>>;
}

export type SessionEvent =
  | { type: "START" }
  | { type: "TICK"; deltaSec: number }
  | { type: "LINE_ENDED"; lineId: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "KEEP_RUNNING" }
  | { type: "CHOOSE_SAVE" }
  | { type: "CHOOSE_FINISH" }
  | { type: "AUDIO_ERROR"; lineId: string; message: string }
  | { type: "RETRY" }
  | { type: "SKIP_LINE" };

function plan(manifest: Manifest, sceneId: string): PlannedScene | null {
  const scene = manifest.scenes.find((s) => s.id === sceneId);
  return scene
    ? {
        sceneId: scene.id,
        type: scene.type,
        part: scene.part,
        lines: scene.lines,
      }
    : null;
}

export function createSession(
  manifest: Manifest,
  timeline: Extract<Timeline, { ok: true }>,
): SessionState {
  const byId = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const entries = timeline.entries.map((entry) => {
    const scene = byId.get(entry.sceneId);
    if (!scene)
      throw new Error(`Timeline scene ${entry.sceneId} is not in the manifest`);
    const lines =
      entry.includeBridge && scene.bridge
        ? [...scene.lines, scene.bridge]
        : scene.lines;
    return { ...entry, lines };
  });
  const signoffScene = manifest.scenes.find((s) => s.type === "signoff");
  const compressedEndings: Partial<Record<CheckpointId, PlannedScene>> = {};
  for (const scene of manifest.scenes) {
    if (scene.type === "compressed_ending" && scene.forCheckpoint) {
      compressedEndings[scene.forCheckpoint] = plan(manifest, scene.id)!;
    }
  }
  const state: SessionState = {
    phase: "ready",
    track: "story",
    durationSec: timeline.durationSec,
    clockSec: 0,
    entries,
    entryIndex: 0,
    lineIndex: 0,
    special: null,
    specialLineIndex: 0,
    isLineActive: false,
    playCount: 0,
    lastCheckpoint: timeline.startCheckpoint,
    hasSaved: false,
    savedCheckpoint: null,
    canFinishNow: false,
    isEpisodeComplete: false,
    hasSkippedLine: false,
    isEndingIntact: true,
    outcome: null,
    error: null,
    pendingChoice: null,
    returnPhase: "playing",
    signoff: signoffScene ? plan(manifest, signoffScene.id) : null,
    compressedEndings,
  };
  return withDerived(state);
}

function withDerived(state: SessionState): SessionState {
  const canFinishNow =
    state.track === "story" &&
    state.lastCheckpoint !== null &&
    state.compressedEndings[state.lastCheckpoint] !== undefined;
  return canFinishNow === state.canFinishNow
    ? state
    : { ...state, canFinishNow };
}

export function currentLine(state: SessionState): Line | undefined {
  if (state.track !== "story")
    return state.special?.lines[state.specialLineIndex];
  return state.entries[state.entryIndex]?.lines[state.lineIndex];
}

export function remainingSec(state: SessionState): number {
  return Math.max(0, state.durationSec - state.clockSec);
}

/** 0..3 for Warm-up, Rising, Climax, Epilogue. */
export function storyPartIndex(state: SessionState): number {
  if (state.track !== "story") return STORY_PARTS.indexOf("epilogue");
  return STORY_PARTS.indexOf(state.entries[state.entryIndex].part);
}

function startLine(state: SessionState): SessionState {
  return { ...state, isLineActive: true, playCount: state.playCount + 1 };
}

function endEpisode(state: SessionState): SessionState {
  const isComplete = state.isEndingIntact;
  return {
    ...state,
    phase: "ended",
    isLineActive: false,
    isEpisodeComplete: isComplete,
    outcome: isComplete ? "complete" : "incomplete",
  };
}

function enterEntry(state: SessionState, index: number): SessionState {
  const entry = state.entries[index];
  const next = { ...state, entryIndex: index, lineIndex: 0 };
  return startLine(
    entry.type === "ending" ? { ...next, isEndingIntact: true } : next,
  );
}

/** Moves past the current line; `shouldStart` plays the next one right away. */
function advance(state: SessionState, shouldStart: boolean): SessionState {
  if (state.track !== "story") {
    const special = state.special!;
    const nextIndex = state.specialLineIndex + 1;
    if (nextIndex < special.lines.length) {
      const moved = {
        ...state,
        specialLineIndex: nextIndex,
        isLineActive: false,
      };
      return shouldStart ? startLine(moved) : moved;
    }
    if (state.track === "signoff") {
      return {
        ...state,
        phase: "ended",
        isLineActive: false,
        outcome: "saved",
      };
    }
    return endEpisode(state);
  }

  const entry = state.entries[state.entryIndex];
  const nextLine = state.lineIndex + 1;
  if (nextLine < entry.lines.length) {
    const moved = { ...state, lineIndex: nextLine, isLineActive: false };
    return shouldStart ? startLine(moved) : moved;
  }
  const reached = withDerived({
    ...state,
    lineIndex: entry.lines.length,
    isLineActive: false,
    lastCheckpoint: entry.checkpoint ?? state.lastCheckpoint,
  });
  if (entry.type === "ending") return endEpisode(reached);
  const nextEntry = state.entries[state.entryIndex + 1];
  if (shouldStart && nextEntry && state.clockSec >= nextEntry.startSec) {
    return enterEntry(reached, state.entryIndex + 1);
  }
  return reached;
}

function applyChoice(state: SessionState, choice: StopChoice): SessionState {
  const base = { ...state, pendingChoice: null, phase: "playing" as const };
  if (choice === "save") {
    const saved = {
      ...base,
      hasSaved: true,
      savedCheckpoint: state.lastCheckpoint,
    };
    if (!state.signoff)
      return {
        ...saved,
        phase: "ended",
        isLineActive: false,
        outcome: "saved",
      };
    return withDerived(
      startLine({
        ...saved,
        track: "signoff",
        special: state.signoff,
        specialLineIndex: 0,
      }),
    );
  }
  const ending = state.compressedEndings[state.lastCheckpoint!]!;
  return withDerived(
    startLine({
      ...base,
      track: "finishing",
      special: ending,
      specialLineIndex: 0,
      isEndingIntact: true,
    }),
  );
}

function lineFinished(state: SessionState, isSkipped: boolean): SessionState {
  const isInEnding =
    state.track === "finishing" ||
    (state.track === "story" &&
      state.entries[state.entryIndex].type === "ending");
  const marked = isSkipped
    ? {
        ...state,
        hasSkippedLine: true,
        isEndingIntact: isInEnding ? false : state.isEndingIntact,
      }
    : state;
  if (marked.phase === "closing") {
    const moved = advance(marked, false);
    return moved.phase === "ended"
      ? moved
      : applyChoice(moved, marked.pendingChoice!);
  }
  return advance(marked, marked.phase === "playing");
}

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  if (state.phase === "ended") return state;
  const line = currentLine(state);

  switch (event.type) {
    case "START":
      return state.phase === "ready"
        ? startLine({ ...state, phase: "playing" })
        : state;

    case "TICK": {
      if (
        state.phase !== "playing" ||
        state.track !== "story" ||
        event.deltaSec <= 0
      ) {
        return state;
      }
      const ticked = { ...state, clockSec: state.clockSec + event.deltaSec };
      const entry = state.entries[state.entryIndex];
      const nextEntry = state.entries[state.entryIndex + 1];
      const isInGap = state.lineIndex >= entry.lines.length;
      if (isInGap && nextEntry && ticked.clockSec >= nextEntry.startSec) {
        return enterEntry(ticked, state.entryIndex + 1);
      }
      return ticked;
    }

    case "LINE_ENDED":
      if (!state.isLineActive || !line || line.id !== event.lineId)
        return state;
      if (state.phase === "error" || state.phase === "ready") return state;
      return lineFinished(state, false);

    case "PAUSE":
      return state.phase === "playing" ? { ...state, phase: "paused" } : state;

    case "RESUME":
      return state.phase === "paused" ? { ...state, phase: "playing" } : state;

    case "STOP":
      if (
        state.phase !== "playing" &&
        state.phase !== "paused" &&
        state.phase !== "error"
      ) {
        return state;
      }
      return { ...state, phase: "stopSheet", returnPhase: state.phase };

    case "KEEP_RUNNING": {
      if (state.phase !== "stopSheet") return state;
      if (state.returnPhase === "error") return { ...state, phase: "error" };
      const resumed = { ...state, phase: "playing" as const };
      const isHeld = !state.isLineActive && line !== undefined;
      return isHeld ? startLine(resumed) : resumed;
    }

    case "CHOOSE_SAVE":
    case "CHOOSE_FINISH": {
      if (state.phase !== "stopSheet") return state;
      const choice: StopChoice =
        event.type === "CHOOSE_SAVE" ? "save" : "finish";
      if (choice === "finish" && !state.canFinishNow) return state;
      if (state.isLineActive && state.returnPhase !== "error") {
        // Save now so a failure while the line finishes cannot lose progress.
        const savedNow =
          choice === "save"
            ? { hasSaved: true, savedCheckpoint: state.lastCheckpoint }
            : {};
        return {
          ...state,
          ...savedNow,
          phase: "closing",
          pendingChoice: choice,
        };
      }
      return applyChoice(
        { ...state, isLineActive: false, error: null },
        choice,
      );
    }

    case "AUDIO_ERROR":
      if (!state.isLineActive || !line || line.id !== event.lineId)
        return state;
      if (state.phase === "ready" || state.phase === "error") return state;
      return {
        ...state,
        phase: "error",
        returnPhase: state.phase === "closing" ? "closing" : "playing",
        error: { lineId: event.lineId, message: event.message },
      };

    case "RETRY":
      if (state.phase !== "error") return state;
      return startLine({
        ...state,
        phase: returnFromError(state),
        error: null,
      });

    case "SKIP_LINE":
      if (state.phase !== "error") return state;
      return lineFinished(
        { ...state, phase: returnFromError(state), error: null },
        true,
      );
  }
}

function returnFromError(state: SessionState): "playing" | "closing" {
  return state.returnPhase === "closing" ? "closing" : "playing";
}
