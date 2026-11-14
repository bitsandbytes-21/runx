"use client";

import { useEffect, useReducer, useRef, type Dispatch } from "react";
import type { AudioPort } from "@/lib/audio/audio-port";
import type { Manifest } from "@/lib/manifest/schema";
import { SPEAKER_NAMES } from "@/lib/manifest/labels";
import type { Timeline } from "@/lib/scheduler/build-timeline";
import {
  createSession,
  currentLine,
  sessionReducer,
  type SessionEvent,
  type SessionState,
} from "@/lib/session/session-reducer";

export interface Clock {
  now: () => number;
}

interface UseRunSessionOptions {
  manifest: Manifest;
  timeline: Extract<Timeline, { ok: true }>;
  audio: AudioPort;
  clock: Clock;
  /** 1 for real runs; the demo and E2E speed the clock up. */
  speed?: number;
  /** Start playing on mount (the Start tap already happened on Home). */
  autoStart?: boolean;
}

const TICK_MS = 250;

/** Whether the current line should be audible (it may finish behind the Stop sheet). */
function shouldSound(state: SessionState): boolean {
  if (!state.isLineActive) return false;
  if (state.phase === "playing" || state.phase === "closing") return true;
  return state.phase === "stopSheet" && state.returnPhase === "playing";
}

export function useRunSession({
  manifest,
  timeline,
  audio,
  clock,
  speed = 1,
  autoStart = false,
}: UseRunSessionOptions): {
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
} {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => {
    const session = createSession(manifest, timeline);
    return autoStart ? sessionReducer(session, { type: "START" }) : session;
  });
  const line = currentLine(state);
  const lineKey =
    line && state.isLineActive
      ? `${state.track}:${line.id}:${state.playCount}`
      : null;
  const isAudible = shouldSound(state);
  const isHalted = state.phase === "error" || state.phase === "ended";
  const startedKey = useRef<string | null>(null);

  useEffect(() => audio.setRate(speed), [audio, speed]);

  // The session clock only runs while playing; it is driven by the injected clock.
  useEffect(() => {
    if (state.phase !== "playing") return;
    let last = clock.now();
    const timer = setInterval(() => {
      const now = clock.now();
      dispatch({ type: "TICK", deltaSec: ((now - last) / 1000) * speed });
      last = now;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state.phase, clock, speed]);

  // Audio follows the reducer: start a line when its key changes, otherwise pause or resume.
  useEffect(() => {
    if (!lineKey || !line || isHalted) {
      if (startedKey.current) audio.stop();
      startedKey.current = null;
      return;
    }
    if (startedKey.current !== lineKey) {
      startedKey.current = lineKey;
      const lineId = line.id;
      audio.play(line, {
        onEnded: () => dispatch({ type: "LINE_ENDED", lineId }),
        onError: (message) =>
          dispatch({ type: "AUDIO_ERROR", lineId, message }),
      });
      if (!isAudible) audio.pause();
      return;
    }
    if (isAudible) audio.resume();
    else audio.pause();
  }, [lineKey, line, isAudible, isHalted, audio]);

  useEffect(() => () => audio.stop(), [audio]);

  // Lock screen and earbud controls where the browser supports them.
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator) ||
      !line
    )
      return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: line.text.length > 60 ? `${line.text.slice(0, 57)}...` : line.text,
      artist: SPEAKER_NAMES[line.speaker],
      album: `RunX, ${manifest.title}`,
      artwork: [
        {
          src: `/characters/${line.speaker}/dream/${line.speaker === "quixote" ? "inspired" : "skeptical"}.webp`,
          sizes: "72x72",
          type: "image/webp",
        },
      ],
    });
  }, [line, manifest.title]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    const session = navigator.mediaSession;
    session.setActionHandler("play", () => dispatch({ type: "RESUME" }));
    session.setActionHandler("pause", () => dispatch({ type: "PAUSE" }));
    return () => {
      session.setActionHandler("play", null);
      session.setActionHandler("pause", null);
    };
  }, []);

  // Keep the screen on while running (Should, FR-05); ignored where unsupported.
  const isRunning = state.phase !== "ready" && state.phase !== "ended";
  useEffect(() => {
    if (
      !isRunning ||
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator)
    )
      return;
    let lock: WakeLockSentinel | null = null;
    let isCancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (isCancelled) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => {
        // Battery saver or an inactive tab can refuse the lock; running still works.
      });
    return () => {
      isCancelled = true;
      void lock?.release();
    };
  }, [isRunning]);

  return { state, dispatch };
}
