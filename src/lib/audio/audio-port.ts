import type { Line } from "@/lib/manifest/schema";

export interface PlayHandlers {
  onEnded: () => void;
  onError: (message: string) => void;
}

/** What the session needs from audio; injected so tests never play sound. */
export interface AudioPort {
  /** Plays a line from its start, replacing anything playing. */
  play: (line: Line, handlers: PlayHandlers) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
}

/**
 * Plays nothing and reports each line as ended after its manifest duration.
 * Used by unit tests and E2E (`?audio=silent`) so no test waits real minutes.
 */
export function createSilentAudioPort(): AudioPort {
  let rate = 1;
  let remainingMs = 0;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: PlayHandlers | null = null;

  function clear() {
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  function schedule() {
    clear();
    const handlers = current;
    startedAt = Date.now();
    timer = setTimeout(() => {
      timer = undefined;
      if (handlers && handlers === current) {
        current = null;
        handlers.onEnded();
      }
    }, remainingMs);
  }

  return {
    play(line, handlers) {
      current = handlers;
      remainingMs = (line.durationSec * 1000) / rate;
      schedule();
    },
    pause() {
      if (!timer) return;
      remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
      clear();
    },
    resume() {
      if (current && !timer) schedule();
    },
    stop() {
      current = null;
      clear();
    },
    setRate(next) {
      rate = next;
    },
  };
}

// One shared element: iOS only lets an element play after a tap has "unlocked" it.
let sharedElement: HTMLAudioElement | null = null;

function getSharedElement(): HTMLAudioElement {
  sharedElement ??= new Audio();
  return sharedElement;
}

/** Call from the Start tap handler so later playback is allowed on iOS. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  const element = getSharedElement();
  element.src = "/audio/silence.m4a";
  element.play().catch(() => {
    // A blocked unlock is fine: the first line then fails visibly with Retry.
  });
}

/** Real playback through one HTMLAudioElement; clips come from preloaded blob URLs. */
export function createHtmlAudioPort(
  resolveUrl: (url: string) => string,
): AudioPort {
  const element = getSharedElement();
  let token = 0;
  let rate = 1;

  return {
    play(line, handlers) {
      const mine = ++token;
      element.onended = () => mine === token && handlers.onEnded();
      element.onerror = () =>
        mine === token &&
        handlers.onError("The audio file could not be loaded");
      element.src = resolveUrl(line.audioUrl);
      element.playbackRate = rate;
      element.currentTime = 0;
      element.play().catch((error: unknown) => {
        if (mine !== token) return;
        const isBlocked =
          error instanceof DOMException && error.name === "NotAllowedError";
        handlers.onError(
          isBlocked
            ? "The browser blocked audio until you tap"
            : "The audio could not start",
        );
      });
    },
    pause() {
      element.pause();
    },
    resume() {
      element.play().catch(() => {
        // Resume failures surface on the next play attempt.
      });
    },
    stop() {
      token++;
      element.pause();
    },
    setRate(next) {
      // Above 2x speech stops being followable, even in the demo.
      rate = Math.min(next, 2);
      element.playbackRate = rate;
    },
  };
}
