import Image from "next/image";
import type { Line } from "@/lib/manifest/schema";
import { SPEAKER_NAMES } from "@/lib/manifest/labels";
import { GLASS_BUTTON, GLASS_CARD, PRIMARY_BUTTON } from "./styles";

export type Mood = "speaking" | "paused" | "charge";

const EXPRESSIONS = {
  quixote: { speaking: "inspired", paused: "confused", charge: "shouting" },
  sancho: { speaking: "skeptical", paused: "thinking", charge: "surprised" },
} as const;

interface CaptionCardProps {
  line: Line | undefined;
  mood: Mood;
  error?: { message: string } | null;
  onRetry?: () => void;
  onSkipLine?: () => void;
}

export function CaptionCard({
  line,
  mood,
  error,
  onRetry,
  onSkipLine,
}: CaptionCardProps) {
  return (
    <section
      role="status"
      aria-label="Caption"
      aria-live="polite"
      className={`${GLASS_CARD} flex min-h-28 flex-col gap-3`}
    >
      {line ? (
        <div className="flex items-start gap-3">
          <Image
            src={`/characters/${line.speaker}/dream/${EXPRESSIONS[line.speaker][mood]}.webp`}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-pill"
          />
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-footnote text-fg-2">
              {/* Shape, not only color, identifies the speaker: a tall pill or a circle. */}
              <span
                aria-hidden="true"
                className={
                  line.speaker === "quixote"
                    ? "h-5 w-[9px] rounded-pill bg-quixote"
                    : "size-4 rounded-pill bg-sancho"
                }
              />
              {SPEAKER_NAMES[line.speaker]}
            </p>
            <p className="text-headline font-semibold tracking-[-0.01em]">
              {line.text}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-footnote text-fg-2">
          The road goes on. They will talk again soon.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-group bg-glass-solid p-3"
        >
          <p className="text-footnote text-error">
            Could not play this line: {error.message}. The clock is stopped.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={PRIMARY_BUTTON} onClick={onRetry}>
              Retry
            </button>
            <button type="button" className={GLASS_BUTTON} onClick={onSkipLine}>
              Skip this line
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
