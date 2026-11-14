import type { SessionState } from "@/lib/session/session-reducer";
import type { ProgressChange } from "./progress-record";

/** What changed between two session states that must be persisted. */
export function progressChanges(
  before: SessionState,
  after: SessionState,
): ProgressChange[] {
  const changes: ProgressChange[] = [];
  if (
    after.lastCheckpoint !== null &&
    after.lastCheckpoint !== before.lastCheckpoint
  ) {
    changes.push({ kind: "checkpoint", checkpoint: after.lastCheckpoint });
  }
  if (after.hasSaved && !before.hasSaved) {
    changes.push({ kind: "saved", checkpoint: after.savedCheckpoint });
  }
  if (after.isEpisodeComplete && !before.isEpisodeComplete) {
    changes.push({ kind: "complete" });
  }
  return changes;
}
