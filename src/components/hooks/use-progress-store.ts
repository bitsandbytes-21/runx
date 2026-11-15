"use client";

import { useState } from "react";
import {
  browserStorage,
  createLocalProgressStore,
  GUEST_PROGRESS_KEY,
} from "@/lib/progress/local-progress-store";
import type { ProgressStore } from "@/lib/progress/progress-record";

/** Where this visitor's progress lives. Guests keep it on the device. */
export function useProgressStore(): ProgressStore {
  const [store] = useState(() =>
    createLocalProgressStore(browserStorage(), GUEST_PROGRESS_KEY),
  );
  return store;
}
