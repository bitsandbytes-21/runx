import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSilentAudioPort } from "@/lib/audio/audio-port";
import type { Line } from "@/lib/manifest/schema";

const line: Line = {
  id: "l1",
  speaker: "sancho",
  text: "Hi",
  audioUrl: "/a.m4a",
  durationSec: 2,
};

describe("createSilentAudioPort", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ends a line after its duration divided by the rate", () => {
    const port = createSilentAudioPort();
    const onEnded = vi.fn();
    port.setRate(2);
    port.play(line, { onEnded, onError: vi.fn() });
    vi.advanceTimersByTime(999);
    expect(onEnded).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("keeps the remaining time across pause and resume", () => {
    const port = createSilentAudioPort();
    const onEnded = vi.fn();
    port.play(line, { onEnded, onError: vi.fn() });
    vi.advanceTimersByTime(1500);
    port.pause();
    vi.advanceTimersByTime(10_000);
    expect(onEnded).not.toHaveBeenCalled();
    port.resume();
    vi.advanceTimersByTime(499);
    expect(onEnded).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("never reports a line that was stopped or replaced", () => {
    const port = createSilentAudioPort();
    const first = vi.fn();
    port.play(line, { onEnded: first, onError: vi.fn() });
    port.play({ ...line, id: "l2" }, { onEnded: vi.fn(), onError: vi.fn() });
    port.stop();
    vi.advanceTimersByTime(5000);
    expect(first).not.toHaveBeenCalled();
  });
});
