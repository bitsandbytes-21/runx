"use client";

import { useEffect, useRef, useState } from "react";
import type { Manifest } from "@/lib/manifest/schema";
import {
  applyProgressChange,
  type ProgressRecord,
  type ProgressStore,
} from "@/lib/progress/progress-record";
import { progressChanges } from "@/lib/progress/session-progress";
import type { SessionState } from "@/lib/session/session-reducer";

/**
 * Persists checkpoints, saves and completion as the session reaches them, so a
 * reload or a crash never loses more than the scene in progress.
 */
export function useProgressSync(
  state: SessionState,
  store: ProgressStore,
  manifest: Manifest,
  durationMin: number | null,
): { saveError: string | null } {
  const previous = useRef(state);
  const record = useRef<ProgressRecord | null | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const changes = progressChanges(previous.current, state);
    previous.current = state;
    if (changes.length === 0) return;
    queue.current = queue.current
      .then(async () => {
        if (record.current === undefined) {
          const loaded = await store.load(manifest);
          record.current = loaded.kind === "ok" ? loaded.record : null;
        }
        for (const change of changes) {
          record.current = applyProgressChange(record.current, change, {
            episodeId: manifest.episodeId,
            manifestVersion: manifest.manifestVersion,
            nowIso: new Date().toISOString(),
            durationMin,
          });
        }
        if (record.current) await store.save(record.current);
      })
      .catch((error: unknown) => {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Progress could not be saved",
        );
      });
  }, [state, store, manifest, durationMin]);

  return { saveError };
}
