import { buildTimeline } from "@/lib/scheduler/build-timeline";
import {
  createSession,
  currentLine,
  sessionReducer,
  type SessionEvent,
  type SessionState,
} from "@/lib/session/session-reducer";
import { makeManifest } from "./manifest-fixture";

export function startedSession(durationMin = 20): SessionState {
  const manifest = makeManifest();
  const timeline = buildTimeline(manifest, durationMin, null);
  if (!timeline.ok) throw new Error("fixture must fit");
  return sessionReducer(createSession(manifest, timeline), { type: "START" });
}

export function applyEvents(
  state: SessionState,
  ...events: SessionEvent[]
): SessionState {
  return events.reduce(sessionReducer, state);
}

/** Plays the opening through so a checkpoint (CP1) has been reached. */
export function afterOpening(state = startedSession()): SessionState {
  let current = state;
  while (current.lastCheckpoint === null) {
    current = sessionReducer(current, {
      type: "LINE_ENDED",
      lineId: currentLine(current)!.id,
    });
  }
  return current;
}
