import type { Line } from "./schema";

/** A short breath between lines; matches scripts/content/build-episode.mjs. */
export const LINE_PAUSE_SEC = 0.3;

export function sceneDurationSec(lines: readonly Line[]): number {
  const spoken = lines.reduce((total, line) => total + line.durationSec, 0);
  return Math.ceil(spoken + LINE_PAUSE_SEC * Math.max(0, lines.length - 1));
}
