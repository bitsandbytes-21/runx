"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { DurationPicker } from "./DurationPicker";
import {
  GLASS_BUTTON,
  GLASS_CARD,
  LARGE_TITLE,
  PRIMARY_BUTTON,
  SCREEN,
} from "./styles";
import { Icon } from "./Icon";
import { DEFAULT_DURATION_MIN, finishTime } from "@/lib/run/durations";

interface HomeScreenProps {
  /** Current time in ms, or null while prerendering. */
  now: number | null;
  onStart: (durationMin: number) => void;
  initialDurationMin?: number;
  timeZone?: string;
  /** Continue card for saved progress (issue #11). */
  continueCard?: ReactNode;
  /** Account row: log in or log out (issue #3). */
  accountRow?: ReactNode;
}

export function HomeScreen({
  now,
  onStart,
  initialDurationMin = DEFAULT_DURATION_MIN,
  timeZone,
  continueCard,
  accountRow,
}: HomeScreenProps) {
  const [durationMin, setDurationMin] = useState(initialDurationMin);
  return (
    <main className={SCREEN}>
      <h1 className={LARGE_TITLE}>RunX</h1>

      <div aria-hidden="true" className="flex items-end justify-center gap-2">
        <div className="-rotate-4 overflow-hidden rounded-card">
          <Image
            src="/characters/quixote/dream/hero.webp"
            alt=""
            width={120}
            height={160}
            className="h-40 w-30 object-cover"
            priority
          />
        </div>
        <div className="glass mb-2 flex size-14 items-center justify-center rounded-pill text-footnote font-semibold">
          You
        </div>
        <div className="rotate-[3.5deg] overflow-hidden rounded-card">
          <Image
            src="/characters/sancho/dream/hero.webp"
            alt=""
            width={120}
            height={160}
            className="h-40 w-30 object-cover"
            priority
          />
        </div>
      </div>

      {continueCard}

      <section
        aria-labelledby="episode-title"
        className={`${GLASS_CARD} flex flex-col gap-4`}
      >
        <div>
          <p className="text-footnote text-fg-2">
            Episode 1 · Don Quixote and Sancho
          </p>
          <h2
            id="episode-title"
            className="text-title-3 font-bold tracking-[-0.01em]"
          >
            Giants on the Horizon
          </h2>
        </div>
        <DurationPicker value={durationMin} onChange={setDurationMin} />
        <p className="min-h-[18px] text-footnote text-fg-2" aria-live="polite">
          {now === null
            ? "The story is fitted to this length."
            : `Story ends at ${finishTime(now, durationMin, { timeZone })}. It is fitted to this length.`}
        </p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => onStart(durationMin)}
        >
          <Icon name="run" />
          Ride out
        </button>
      </section>

      <p className="text-center text-footnote text-fg-2">
        Pocket your phone, we’ll talk you through it.
      </p>

      <Link href="/run?demo=1" className={GLASS_BUTTON}>
        Try the demo, no account needed
      </Link>

      {accountRow}
    </main>
  );
}
