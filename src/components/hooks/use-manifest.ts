"use client";

import { useEffect, useState } from "react";
import { EP1_MANIFEST } from "@/content/episodes";
import type { Manifest } from "@/lib/manifest/schema";
import { loadPublishedManifest } from "@/lib/manifest/load-published";

let cached: Promise<Manifest> | null = null;

/** The published Episode 1, fetched once per page load; null until known. */
export function useManifest(): Manifest | null {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    let isCurrent = true;
    cached ??= loadPublishedManifest(EP1_MANIFEST.episodeId, EP1_MANIFEST);
    cached.then((loaded) => isCurrent && setManifest(loaded));
    return () => {
      isCurrent = false;
    };
  }, []);
  return manifest;
}
