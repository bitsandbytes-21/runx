import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRunSession } from "@/components/hooks/use-run-session";
import { createSilentAudioPort } from "@/lib/audio/audio-port";
import { buildTimeline } from "@/lib/scheduler/build-timeline";
import { currentLine } from "@/lib/session/session-reducer";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();

function setup(speed = 1) {
  const timeline = buildTimeline(manifest, 6, null);
  if (!timeline.ok) throw new Error();
  const audio = createSilentAudioPort();
  let nowMs = 0;
  const clock = { now: () => nowMs };
  const hook = renderHook(() =>
    useRunSession({ manifest, timeline, audio, clock, speed }),
  );
  const advance = (ms: number) =>
    act(() => {
      for (let t = 0; t < ms; t += 250) {
        nowMs += 250;
        vi.advanceTimersByTime(250);
      }
    });
  return { hook, advance };
}

describe("useRunSession", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays lines in order with the injected audio and clock", () => {
    const { hook, advance } = setup();
    act(() => hook.result.current.dispatch({ type: "START" }));
    expect(currentLine(hook.result.current.state)?.id).toBe("s01-01");
    advance(30_000);
    expect(currentLine(hook.result.current.state)?.id).toBe("s01-02");
    expect(hook.result.current.state.clockSec).toBeCloseTo(30, 0);
  });

  it("freezes the clock and the line while paused", () => {
    const { hook, advance } = setup();
    act(() => hook.result.current.dispatch({ type: "START" }));
    advance(10_000);
    act(() => hook.result.current.dispatch({ type: "PAUSE" }));
    advance(60_000);
    expect(hook.result.current.state.clockSec).toBeCloseTo(10, 0);
    expect(currentLine(hook.result.current.state)?.id).toBe("s01-01");
    act(() => hook.result.current.dispatch({ type: "RESUME" }));
    advance(20_000);
    expect(currentLine(hook.result.current.state)?.id).toBe("s01-02");
  });

  it("runs a whole 6 minute plan in seconds with an accelerated clock", () => {
    const { hook, advance } = setup(60);
    act(() => hook.result.current.dispatch({ type: "START" }));
    advance(30_000);
    expect(hook.result.current.state.phase).toBe("ended");
    expect(hook.result.current.state.isEpisodeComplete).toBe(true);
  });
});
