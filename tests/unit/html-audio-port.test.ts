import { afterEach, describe, expect, it, vi } from "vitest";
import { createHtmlAudioPort, unlockAudio } from "@/lib/audio/audio-port";
import type { Line } from "@/lib/manifest/schema";

const line: Line = {
  id: "l1",
  speaker: "quixote",
  text: "Behold!",
  audioUrl: "/audio/l1.m4a",
  durationSec: 2,
};

function stubPlay(impl: () => Promise<void>) {
  return vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(impl);
}

describe("createHtmlAudioPort", () => {
  afterEach(() => vi.restoreAllMocks());

  it("plays the preloaded clip and reports when it ends", async () => {
    const play = stubPlay(async () => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const port = createHtmlAudioPort((url) => `blob:${url}`);
    const onEnded = vi.fn();
    port.play(line, { onEnded, onError: vi.fn() });
    expect(play).toHaveBeenCalled();
    const element = play.mock.contexts.at(-1) as HTMLAudioElement;
    expect(element.src).toContain("blob:/audio/l1.m4a");
    element.dispatchEvent(new Event("ended"));
    element.onended?.(new Event("ended"));
    expect(onEnded).toHaveBeenCalled();
  });

  it("explains a blocked autoplay so the runner can tap Retry", async () => {
    stubPlay(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );
    const onError = vi.fn();
    createHtmlAudioPort((url) => url).play(line, { onEnded: vi.fn(), onError });
    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        "The browser blocked audio until you tap",
      ),
    );
  });

  it("reports a load error and ignores events from a stopped line", async () => {
    const play = stubPlay(async () => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const port = createHtmlAudioPort((url) => url);
    const onError = vi.fn();
    port.play(line, { onEnded: vi.fn(), onError });
    const element = play.mock.contexts.at(-1) as HTMLAudioElement;
    element.onerror?.(new Event("error"));
    expect(onError).toHaveBeenCalledWith("The audio file could not be loaded");
    const onEnded = vi.fn();
    port.play(line, { onEnded, onError: vi.fn() });
    port.stop();
    element.onended?.(new Event("ended"));
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("pauses, resumes and caps the playback rate at 2x", () => {
    const play = stubPlay(async () => {});
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});
    const port = createHtmlAudioPort((url) => url);
    port.setRate(10);
    port.play(line, { onEnded: vi.fn(), onError: vi.fn() });
    const element = play.mock.contexts.at(-1) as HTMLAudioElement;
    expect(element.playbackRate).toBe(2);
    port.pause();
    expect(pause).toHaveBeenCalled();
    port.resume();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("unlocks the shared element with a silent clip", () => {
    const play = stubPlay(async () => {});
    unlockAudio();
    expect((play.mock.contexts.at(-1) as HTMLAudioElement).src).toContain(
      "/audio/silence.m4a",
    );
  });
});
