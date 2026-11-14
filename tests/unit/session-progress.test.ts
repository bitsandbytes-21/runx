import { describe, expect, it } from "vitest";
import { progressChanges } from "@/lib/progress/session-progress";
import {
  afterOpening,
  applyEvents,
  startedSession,
} from "../fixtures/session-fixture";
import {
  currentLine,
  sessionReducer,
  type SessionState,
} from "@/lib/session/session-reducer";

function playToEnd(state: SessionState): SessionState {
  let current = state;
  while (current.phase !== "ended") {
    const line = currentLine(current);
    current =
      line && current.isLineActive
        ? sessionReducer(current, { type: "LINE_ENDED", lineId: line.id })
        : sessionReducer(current, { type: "TICK", deltaSec: 1000 });
  }
  return current;
}

describe("progressChanges", () => {
  it("reports nothing when nothing changed", () => {
    const state = startedSession();
    expect(progressChanges(state, state)).toEqual([]);
  });

  it("reports a reached checkpoint", () => {
    const before = startedSession();
    expect(progressChanges(before, afterOpening(before))).toEqual([
      { kind: "checkpoint", checkpoint: "CP1" },
    ]);
  });

  it("reports a save once, with the saved checkpoint", () => {
    const before = applyEvents(afterOpening(), { type: "STOP" });
    const after = applyEvents(before, { type: "CHOOSE_SAVE" });
    expect(progressChanges(before, after)).toEqual([
      { kind: "saved", checkpoint: "CP1" },
    ]);
    expect(
      progressChanges(after, applyEvents(after, { type: "CHOOSE_SAVE" })),
    ).toEqual([]);
  });

  it("reports completion only after the ending has played", () => {
    const before = startedSession(6);
    const after = playToEnd(before);
    expect(progressChanges(before, after)).toContainEqual({ kind: "complete" });
  });

  it("never reports completion after an audio failure in the compressed ending", () => {
    let state = applyEvents(
      afterOpening(),
      { type: "STOP" },
      { type: "CHOOSE_FINISH" },
    );
    const before = state;
    state = applyEvents(
      state,
      { type: "AUDIO_ERROR", lineId: currentLine(state)!.id, message: "x" },
      { type: "SKIP_LINE" },
    );
    state = playToEnd(state);
    expect(progressChanges(before, state)).not.toContainEqual({
      kind: "complete",
    });
  });
});
