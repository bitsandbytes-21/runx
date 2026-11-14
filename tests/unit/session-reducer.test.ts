import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/scheduler/build-timeline";
import {
  createSession,
  currentLine,
  remainingSec,
  sessionReducer,
  storyPartIndex,
  type SessionEvent,
  type SessionState,
} from "@/lib/session/session-reducer";
import type { CheckpointId } from "@/lib/manifest/schema";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();

function startSession(
  durationMin = 20,
  checkpoint: CheckpointId | null = null,
): SessionState {
  const timeline = buildTimeline(manifest, durationMin, checkpoint);
  if (!timeline.ok) throw new Error("fixture must fit");
  return sessionReducer(createSession(manifest, timeline), { type: "START" });
}

function apply(state: SessionState, ...events: SessionEvent[]): SessionState {
  return events.reduce(sessionReducer, state);
}

/** Ends the playing line, or jumps the clock to the next scene during a gap. */
function step(state: SessionState): SessionState {
  const line = currentLine(state);
  if (line && state.isLineActive) {
    return sessionReducer(state, { type: "LINE_ENDED", lineId: line.id });
  }
  return sessionReducer(state, { type: "TICK", deltaSec: 1000 });
}

function stepUntil(
  state: SessionState,
  done: (s: SessionState) => boolean,
): SessionState {
  let current = state;
  for (let guard = 0; guard < 500 && !done(current); guard++) {
    current = step(current);
  }
  if (!done(current)) throw new Error("condition never reached");
  return current;
}

function endCurrentLine(state: SessionState): SessionState {
  return sessionReducer(state, {
    type: "LINE_ENDED",
    lineId: currentLine(state)!.id,
  });
}

describe("sessionReducer", () => {
  it("is not started until START, then plays the first line of the opening", () => {
    const timeline = buildTimeline(manifest, 20, null);
    if (!timeline.ok) throw new Error();
    const fresh = createSession(manifest, timeline);
    expect(fresh.phase).toBe("ready");
    expect(fresh.isLineActive).toBe(false);
    const started = sessionReducer(fresh, { type: "START" });
    expect(started.phase).toBe("playing");
    expect(currentLine(started)?.id).toBe("s01-01");
    expect(started.isLineActive).toBe(true);
  });

  it("ignores ticks before start and while paused", () => {
    const timeline = buildTimeline(manifest, 20, null);
    if (!timeline.ok) throw new Error();
    const fresh = createSession(manifest, timeline);
    expect(sessionReducer(fresh, { type: "TICK", deltaSec: 5 }).clockSec).toBe(
      0,
    );
    const paused = apply(startSession(), { type: "PAUSE" });
    expect(apply(paused, { type: "TICK", deltaSec: 30 }).clockSec).toBe(0);
  });

  it("counts the remaining time down with the session clock", () => {
    const state = apply(startSession(20), { type: "TICK", deltaSec: 90 });
    expect(state.clockSec).toBe(90);
    expect(remainingSec(state)).toBe(20 * 60 - 90);
  });

  it("plays lines in order, waits through silence, then starts the next scene", () => {
    let state = endCurrentLine(startSession());
    expect(currentLine(state)?.id).toBe("s01-02");
    state = endCurrentLine(state);
    expect(state.isLineActive).toBe(false); // in the gap after the opening
    const nextStart = state.entries[1].startSec;
    state = apply(state, { type: "TICK", deltaSec: nextStart - 1 });
    expect(state.isLineActive).toBe(false);
    state = apply(state, { type: "TICK", deltaSec: 1 });
    expect(state.isLineActive).toBe(true);
    expect(currentLine(state)?.id).toBe(`${state.entries[1].sceneId}-01`);
  });

  it("speaks the bridge line when the timeline includes it", () => {
    const timeline = buildTimeline(manifest, 45, null);
    if (!timeline.ok) throw new Error();
    let state = sessionReducer(createSession(manifest, timeline), {
      type: "START",
    });
    state = endCurrentLine(endCurrentLine(state));
    expect(currentLine(state)?.id).toBe("s01-bridge");
  });

  it("reaches a checkpoint only after the scene has fully played", () => {
    let state = endCurrentLine(startSession());
    expect(state.lastCheckpoint).toBeNull();
    state = endCurrentLine(state);
    expect(state.lastCheckpoint).toBe("CP1");
  });

  it("ignores a stale LINE_ENDED for a line that is not playing", () => {
    const state = startSession();
    expect(
      sessionReducer(state, { type: "LINE_ENDED", lineId: "s03-01" }),
    ).toBe(state);
  });

  describe("pause", () => {
    it("freezes the clock and resumes from the same line", () => {
      let state = apply(
        startSession(),
        { type: "TICK", deltaSec: 10 },
        { type: "PAUSE" },
      );
      expect(state.phase).toBe("paused");
      state = apply(state, { type: "TICK", deltaSec: 60 }, { type: "RESUME" });
      expect(state.phase).toBe("playing");
      expect(state.clockSec).toBe(10);
      expect(currentLine(state)?.id).toBe("s01-01");
    });

    it("does nothing when pressed twice", () => {
      const paused = apply(startSession(), { type: "PAUSE" });
      expect(sessionReducer(paused, { type: "PAUSE" })).toBe(paused);
    });
  });

  describe("stop", () => {
    it("opens the sheet, freezes the clock and lets the current line finish", () => {
      const state = apply(startSession(), { type: "STOP" });
      expect(state.phase).toBe("stopSheet");
      expect(state.isLineActive).toBe(true);
      expect(apply(state, { type: "TICK", deltaSec: 30 }).clockSec).toBe(0);
    });

    it("holds the next line while the sheet is open", () => {
      const state = endCurrentLine(apply(startSession(), { type: "STOP" }));
      expect(state.phase).toBe("stopSheet");
      expect(state.isLineActive).toBe(false);
      expect(currentLine(state)?.id).toBe("s01-02");
    });

    it("causes no state change when pressed twice", () => {
      const once = apply(startSession(), { type: "STOP" });
      expect(sessionReducer(once, { type: "STOP" })).toBe(once);
    });

    it("keep running restores the position and continues with the next line", () => {
      let state = apply(
        startSession(),
        { type: "TICK", deltaSec: 4 },
        { type: "STOP" },
      );
      state = endCurrentLine(state);
      state = apply(state, { type: "KEEP_RUNNING" });
      expect(state.phase).toBe("playing");
      expect(state.clockSec).toBe(4);
      expect(currentLine(state)?.id).toBe("s01-02");
      expect(state.isLineActive).toBe(true);
    });

    it("offers only Save before the opening has ended", () => {
      const early = apply(startSession(), { type: "STOP" });
      expect(early.canFinishNow).toBe(false);
      expect(apply(early, { type: "CHOOSE_FINISH" })).toBe(early);
      const later = apply(
        stepUntil(startSession(), (s) => s.lastCheckpoint === "CP1"),
        { type: "STOP" },
      );
      expect(later.canFinishNow).toBe(true);
    });

    it("finishes the current line before the sign-off starts", () => {
      let state = apply(
        startSession(),
        { type: "STOP" },
        { type: "CHOOSE_SAVE" },
      );
      expect(state.phase).toBe("closing");
      expect(currentLine(state)?.id).toBe("s01-01");
      state = endCurrentLine(state);
      expect(state.track).toBe("signoff");
      expect(currentLine(state)?.id).toBe("x01-01");
      expect(state.isLineActive).toBe(true);
    });

    it("finishes a paused line before the sign-off", () => {
      const state = apply(
        startSession(),
        { type: "PAUSE" },
        { type: "STOP" },
        { type: "CHOOSE_SAVE" },
      );
      expect(state.phase).toBe("closing");
      expect(currentLine(state)?.id).toBe("s01-01");
    });

    it("ignores a second choice while the line is finishing", () => {
      const closing = apply(
        startSession(),
        { type: "STOP" },
        { type: "CHOOSE_SAVE" },
      );
      expect(sessionReducer(closing, { type: "CHOOSE_SAVE" })).toBe(closing);
      expect(sessionReducer(closing, { type: "STOP" })).toBe(closing);
    });
  });

  describe("save for next time", () => {
    it("saves the last completed checkpoint and keeps the episode in progress", () => {
      let state = stepUntil(startSession(), (s) => s.lastCheckpoint === "CP2");
      state = apply(state, { type: "STOP" });
      state = apply(state, { type: "CHOOSE_SAVE" });
      expect(state.savedCheckpoint).toBe("CP2");
      state = stepUntil(state, (s) => s.phase === "ended");
      expect(state.outcome).toBe("saved");
      expect(state.isEpisodeComplete).toBe(false);
      expect(state.lastCheckpoint).toBe("CP2");
    });

    it("keeps progress saved even if the sign-off audio fails", () => {
      let state = stepUntil(startSession(), (s) => s.lastCheckpoint === "CP1");
      state = apply(state, { type: "STOP" }, { type: "CHOOSE_SAVE" });
      state = apply(state, {
        type: "AUDIO_ERROR",
        lineId: "x01-01",
        message: "network",
      });
      expect(state.savedCheckpoint).toBe("CP1");
      expect(state.isEpisodeComplete).toBe(false);
    });
  });

  describe("finish the story now", () => {
    it("plays the compressed ending for the checkpoint and completes after it", () => {
      let state = stepUntil(startSession(), (s) => s.lastCheckpoint === "CP2");
      state = apply(state, { type: "STOP" }, { type: "CHOOSE_FINISH" });
      expect(state.track).toBe("finishing");
      expect(currentLine(state)?.id).toBe("c02-01");
      state = endCurrentLine(state);
      expect(state.isEpisodeComplete).toBe(false);
      state = endCurrentLine(state);
      expect(state.phase).toBe("ended");
      expect(state.outcome).toBe("complete");
      expect(state.isEpisodeComplete).toBe(true);
    });

    it("never completes the episode when a line of the ending was skipped", () => {
      let state = stepUntil(startSession(), (s) => s.lastCheckpoint === "CP1");
      state = apply(state, { type: "STOP" }, { type: "CHOOSE_FINISH" });
      state = apply(
        state,
        { type: "AUDIO_ERROR", lineId: "c01-01", message: "decode" },
        { type: "SKIP_LINE" },
      );
      state = endCurrentLine(state);
      expect(state.phase).toBe("ended");
      expect(state.outcome).toBe("incomplete");
      expect(state.isEpisodeComplete).toBe(false);
    });
  });

  describe("errors", () => {
    it("stops the clock and shows which line failed", () => {
      let state = apply(startSession(), {
        type: "AUDIO_ERROR",
        lineId: "s01-01",
        message: "load failed",
      });
      expect(state.phase).toBe("error");
      expect(state.error).toEqual({ lineId: "s01-01", message: "load failed" });
      state = apply(state, { type: "TICK", deltaSec: 20 });
      expect(state.clockSec).toBe(0);
    });

    it("retry replays the same line", () => {
      const state = apply(
        startSession(),
        { type: "AUDIO_ERROR", lineId: "s01-01", message: "x" },
        { type: "RETRY" },
      );
      expect(state.phase).toBe("playing");
      expect(currentLine(state)?.id).toBe("s01-01");
      expect(state.isLineActive).toBe(true);
      expect(state.error).toBeNull();
      expect(state.playCount).toBeGreaterThan(1);
    });

    it("skip moves to the next line only when the runner chooses it", () => {
      const failed = apply(startSession(), {
        type: "AUDIO_ERROR",
        lineId: "s01-01",
        message: "x",
      });
      expect(currentLine(failed)?.id).toBe("s01-01");
      const skipped = apply(failed, { type: "SKIP_LINE" });
      expect(currentLine(skipped)?.id).toBe("s01-02");
      expect(skipped.hasSkippedLine).toBe(true);
    });

    it("ignores an error for a line that is not playing", () => {
      const state = startSession();
      expect(
        sessionReducer(state, {
          type: "AUDIO_ERROR",
          lineId: "zzz",
          message: "x",
        }),
      ).toBe(state);
    });
  });

  describe("full run", () => {
    it("completes the episode once, after the ending fully plays", () => {
      let state = startSession(20);
      state = stepUntil(
        state,
        (s) => s.entries[s.entryIndex].type === "ending" && s.isLineActive,
      );
      expect(state.isEpisodeComplete).toBe(false);
      state = stepUntil(state, (s) => s.phase === "ended");
      expect(state.outcome).toBe("complete");
      expect(state.isEpisodeComplete).toBe(true);
      expect(state.lastCheckpoint).toBe("CP3");
      expect(sessionReducer(state, { type: "STOP" })).toBe(state);
      expect(sessionReducer(state, { type: "TICK", deltaSec: 5 })).toBe(state);
    });

    it("does not mark the episode complete if a line of the ending was skipped", () => {
      let state = stepUntil(
        startSession(20),
        (s) => s.entries[s.entryIndex].type === "ending" && s.isLineActive,
      );
      state = apply(
        state,
        { type: "AUDIO_ERROR", lineId: currentLine(state)!.id, message: "x" },
        { type: "SKIP_LINE" },
      );
      state = stepUntil(state, (s) => s.phase === "ended");
      expect(state.outcome).toBe("incomplete");
      expect(state.isEpisodeComplete).toBe(false);
    });

    it("reports the story part of the current scene", () => {
      const state = startSession(20);
      expect(storyPartIndex(state)).toBe(0);
      const climax = stepUntil(
        state,
        (s) => s.entries[s.entryIndex].type === "climax",
      );
      expect(storyPartIndex(climax)).toBe(2);
    });

    it("starts from the saved checkpoint when resuming", () => {
      const state = startSession(20, "CP2");
      expect(state.lastCheckpoint).toBe("CP2");
      expect(state.canFinishNow).toBe(true);
      expect(currentLine(state)?.id).toBe("s04-01");
    });
  });
});
