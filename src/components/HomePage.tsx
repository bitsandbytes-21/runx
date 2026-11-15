"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccountRow } from "./AccountRow";
import { ContinueCard } from "./ContinueCard";
import { HomeScreen } from "./HomeScreen";
import { ImportPrompt } from "./ImportPrompt";
import { useAuth } from "./hooks/use-auth";
import { useGuestImport } from "./hooks/use-guest-import";
import { useNow } from "./hooks/use-now";
import { useProgressStore } from "./hooks/use-progress-store";
import { useSavedProgress } from "./hooks/use-saved-progress";
import { EP1_MANIFEST } from "@/content/episodes";
import { useManifest } from "./hooks/use-manifest";
import { unlockAudio } from "@/lib/audio/audio-port";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { CHECKPOINT_LABELS } from "@/lib/manifest/labels";
import { withTestParams } from "@/lib/run/run-options";

export function HomePage() {
  const router = useRouter();
  const manifest = useManifest() ?? EP1_MANIFEST;
  const params = useSearchParams();
  const now = useNow();
  const auth = useAuth();
  const store = useProgressStore();
  const { load, reload } = useSavedProgress(store, manifest);
  const guestImport = useGuestImport(auth, store, load, manifest, reload);
  const lastDurationMin =
    load?.kind === "ok"
      ? (load.record.lastDurationMin ?? undefined)
      : undefined;

  const continueCard = guestImport.offer ? (
    <ImportPrompt
      checkpointLabel={
        guestImport.offer.checkpoint
          ? CHECKPOINT_LABELS[guestImport.offer.checkpoint]
          : "Episode complete"
      }
      onImport={guestImport.accept}
      onDecline={guestImport.decline}
    />
  ) : (
    load &&
    store && (
      <ContinueCard
        manifest={manifest}
        load={load}
        onRestart={() => {
          void store.clear(EP1_MANIFEST.episodeId).then(reload);
        }}
      />
    )
  );

  return (
    <HomeScreen
      // Remount once progress loads so the last used length is preselected.
      key={lastDurationMin ?? "default"}
      now={now}
      initialDurationMin={lastDurationMin}
      continueCard={continueCard}
      accountRow={
        <AccountRow
          auth={auth}
          onLogOut={() => {
            void getBrowserSupabase()?.auth.signOut();
          }}
        />
      }
      onStart={(durationMin) => {
        // Inside the tap handler, so iOS allows the run's audio later.
        unlockAudio();
        router.push(
          `/run?${withTestParams(params, new URLSearchParams({ min: String(durationMin) }))}`,
        );
      }}
    />
  );
}
