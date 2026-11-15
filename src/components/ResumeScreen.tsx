"use client";

import { useState } from "react";
import { DurationPicker } from "./DurationPicker";
import { RecapBubbles } from "./RecapBubbles";
import {
  GLASS_BUTTON,
  GLASS_CARD,
  LARGE_TITLE,
  PRIMARY_BUTTON,
  SCREEN,
} from "./styles";
import type { Manifest } from "@/lib/manifest/schema";
import { CHECKPOINT_LABELS } from "@/lib/manifest/labels";
import type { ProgressRecord } from "@/lib/progress/progress-record";
import {
  planResume,
  recapPreview,
  shouldOfferRecap,
} from "@/lib/progress/resume";
import { DEFAULT_DURATION_MIN } from "@/lib/run/durations";

interface ResumeScreenProps {
  manifest: Manifest;
  record: ProgressRecord;
  now: number;
  onContinue: (choice: { durationMin: number; includeRecap: boolean }) => void;
  onRestart: () => void;
}

function savedAgo(lastPlayedAtIso: string, now: number): string {
  const days = Math.round((now - Date.parse(lastPlayedAtIso)) / 86_400_000);
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    -days,
    "day",
  );
}

export function ResumeScreen({
  manifest,
  record,
  now,
  onContinue,
  onRestart,
}: ResumeScreenProps) {
  const isRecapOffered = shouldOfferRecap(record.lastPlayedAt, now);
  const [durationMin, setDurationMin] = useState(
    record.lastDurationMin ?? DEFAULT_DURATION_MIN,
  );
  const [includeRecap, setIncludeRecap] = useState(isRecapOffered);
  const plan = planResume(
    manifest,
    record.checkpoint,
    durationMin,
    includeRecap,
  );
  const checkpointLabel = record.checkpoint
    ? CHECKPOINT_LABELS[record.checkpoint]
    : "The beginning";

  return (
    <main className={SCREEN}>
      <h1 className={LARGE_TITLE}>Welcome back</h1>
      <section className={`${GLASS_CARD} flex flex-col gap-3`}>
        <p className="text-footnote text-fg-2">
          Saved {savedAgo(record.lastPlayedAt, now)}
        </p>
        <h2 className="text-title-3 font-bold">{checkpointLabel}</h2>
        {record.checkpoint && (
          <RecapBubbles lines={recapPreview(manifest, record.checkpoint)} />
        )}
        {isRecapOffered && (
          <label className="flex min-h-tap items-center justify-between gap-3 text-headline font-semibold">
            Play the recap
            <button
              type="button"
              role="switch"
              aria-checked={includeRecap}
              aria-label="Play the recap"
              onClick={() => setIncludeRecap((on) => !on)}
              className={`relative h-8 w-13 rounded-pill transition-colors ${includeRecap ? "bg-sys-green" : "bg-segment-track"}`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 size-6 rounded-pill bg-tint-bg shadow-soft transition-all ${includeRecap ? "left-6" : "left-1"}`}
              />
            </button>
          </label>
        )}
      </section>

      <section className={`${GLASS_CARD} flex flex-col gap-3`}>
        <DurationPicker value={durationMin} onChange={setDurationMin} />
        {plan.kind === "tooShort" && (
          <div role="alert" className="flex flex-col gap-2 text-footnote">
            <p>
              The rest of the story needs at least {plan.minDurationMin} min.
              Nothing is skipped, so pick a longer run.
            </p>
            {plan.suggestedDurationMin && (
              <button
                type="button"
                className={GLASS_BUTTON}
                onClick={() => setDurationMin(plan.suggestedDurationMin!)}
              >
                Use {plan.suggestedDurationMin} min
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={plan.kind !== "fits"}
          onClick={() => onContinue({ durationMin, includeRecap })}
        >
          Continue the story
        </button>
      </section>

      <button type="button" className={GLASS_BUTTON} onClick={onRestart}>
        Restart episode
      </button>
    </main>
  );
}
