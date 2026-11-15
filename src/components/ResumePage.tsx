"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ResumeScreen } from "./ResumeScreen";
import { SCREEN } from "./styles";
import { useNow } from "./hooks/use-now";
import { useProgressStore } from "./hooks/use-progress-store";
import { useSavedProgress } from "./hooks/use-saved-progress";
import { EP1_MANIFEST } from "@/content/episodes";
import { unlockAudio } from "@/lib/audio/audio-port";
import { withTestParams } from "@/lib/run/run-options";

export function ResumePage() {
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const store = useProgressStore();
  const { load } = useSavedProgress(store, EP1_MANIFEST);
  const record =
    load?.kind === "ok" && load.record.status === "in_progress"
      ? load.record
      : null;
  const hasNothingToResume = load !== null && record === null;

  useEffect(() => {
    if (hasNothingToResume) router.replace("/");
  }, [hasNothingToResume, router]);

  if (!record || now === null) {
    return (
      <main className={SCREEN}>
        <p role="status" className="text-footnote text-fg-2">
          Finding your place in the story…
        </p>
      </main>
    );
  }
  return (
    <ResumeScreen
      manifest={EP1_MANIFEST}
      record={record}
      now={now}
      onContinue={({ durationMin, includeRecap }) => {
        unlockAudio();
        const query = new URLSearchParams({
          resume: "1",
          from: record.checkpoint ?? "",
          min: String(durationMin),
        });
        if (includeRecap) query.set("recap", "1");
        router.push(`/run?${withTestParams(params, query)}`);
      }}
      onRestart={() => {
        void store.clear(EP1_MANIFEST.episodeId).then(() => router.push("/"));
      }}
    />
  );
}
