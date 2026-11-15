"use client";

import { useEffect, useState } from "react";
import type { AuthState } from "./use-auth";
import { guestProgressStore } from "./use-progress-store";
import type { Manifest } from "@/lib/manifest/schema";
import {
  importAskedKey,
  shouldOfferImport,
} from "@/lib/progress/import-progress";
import { browserStorage } from "@/lib/progress/local-progress-store";
import type {
  ProgressLoad,
  ProgressRecord,
  ProgressStore,
} from "@/lib/progress/progress-record";

/** On the first login on a device, offers to move guest progress into the account. */
export function useGuestImport(
  auth: AuthState,
  accountStore: ProgressStore | null,
  accountLoad: ProgressLoad | null,
  manifest: Manifest,
  onImported: () => void,
) {
  const [offer, setOffer] = useState<ProgressRecord | null>(null);
  const userId = auth.status === "signedIn" ? auth.userId : null;

  useEffect(() => {
    if (!userId || !accountLoad) return;
    let isCurrent = true;
    const wasAsked = browserStorage().getItem(importAskedKey(userId)) !== null;
    guestProgressStore()
      .load(manifest)
      .then((guest) => {
        if (
          isCurrent &&
          shouldOfferImport(guest, accountLoad, wasAsked) &&
          guest.kind === "ok"
        ) {
          setOffer(guest.record);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [userId, accountLoad, manifest]);

  function answer(shouldImport: boolean) {
    if (!userId || !offer) return;
    browserStorage().setItem(importAskedKey(userId), new Date().toISOString());
    const record = offer;
    setOffer(null);
    if (shouldImport && accountStore) {
      void accountStore
        .save(record)
        .then(() => guestProgressStore().clear(record.episodeId))
        .then(onImported);
    }
  }

  return { offer, accept: () => answer(true), decline: () => answer(false) };
}
