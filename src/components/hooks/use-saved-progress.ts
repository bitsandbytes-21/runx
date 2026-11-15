"use client";

import { useCallback, useEffect, useState } from "react";
import type { Manifest } from "@/lib/manifest/schema";
import type {
  ProgressLoad,
  ProgressStore,
} from "@/lib/progress/progress-record";

/** Loads saved progress once; null while loading. */
export function useSavedProgress(
  store: ProgressStore | null,
  manifest: Manifest,
) {
  const [load, setLoad] = useState<ProgressLoad | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!store) return;
    let isCurrent = true;
    store
      .load(manifest)
      .then((result) => isCurrent && setLoad(result))
      .catch(
        () => isCurrent && setLoad({ kind: "unreadable", reason: "corrupted" }),
      );
    return () => {
      isCurrent = false;
    };
  }, [store, manifest, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  return { load, reload };
}
