"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccountRow } from "./AccountRow";
import { ContinueCard } from "./ContinueCard";
import { useAuth } from "./hooks/use-auth";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { HomeScreen } from "./HomeScreen";
import { useNow } from "./hooks/use-now";
import { useProgressStore } from "./hooks/use-progress-store";
import { useSavedProgress } from "./hooks/use-saved-progress";
import { EP1_MANIFEST } from "@/content/episodes";
import { unlockAudio } from "@/lib/audio/audio-port";
import { withTestParams } from "@/lib/run/run-options";

export function HomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const auth = useAuth();
  const store = useProgressStore();
  const { load, reload } = useSavedProgress(store, EP1_MANIFEST);
  const lastDurationMin =
    load?.kind === "ok"
      ? (load.record.lastDurationMin ?? undefined)
      : undefined;
  return (
    <HomeScreen
      // Remount once progress loads so the last used length is preselected.
      key={lastDurationMin ?? "default"}
      now={now}
      initialDurationMin={lastDurationMin}
      continueCard={
        load && (
          <ContinueCard
            manifest={EP1_MANIFEST}
            load={load}
            onRestart={() => {
              void store.clear(EP1_MANIFEST.episodeId).then(reload);
            }}
          />
        )
      }
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
