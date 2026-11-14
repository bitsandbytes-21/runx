"use client";

import { useSyncExternalStore } from "react";

// Pages are prerendered, so the current time is only read in the browser and
// refreshed every 30 s; the server snapshot is null.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let snapshot: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot(): number | null {
  if (snapshot === null) snapshot = Date.now();
  return snapshot;
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
