import { STORY_PARTS } from "@/lib/manifest/schema";
import { PART_LABELS } from "@/lib/manifest/labels";

interface WindmillPlayerProps {
  /** 0..3: Warm-up, Rising, Climax, Epilogue. */
  partIndex: number;
  isTurning: boolean;
}

// Four sails are the four story parts: done filled, current accent, upcoming outlined.
export function WindmillPlayer({ partIndex, isTurning }: WindmillPlayerProps) {
  const label = `Story part ${partIndex + 1} of 4, ${PART_LABELS[STORY_PARTS[partIndex]]}`;
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={label}
        className="relative h-[168px] w-[176px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
        <img
          src="/brand/windmill-tower.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full"
        />
        <svg
          viewBox="0 0 220 210"
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          <g
            className="sails-turning motion-reduce:animate-none"
            data-paused={!isTurning}
          >
            {STORY_PARTS.map((part, index) => {
              const state =
                index < partIndex
                  ? "done"
                  : index === partIndex
                    ? "current"
                    : "upcoming";
              return (
                <rect
                  key={part}
                  x="104"
                  y="8"
                  width="12"
                  height="82"
                  rx="6"
                  transform={`rotate(${index * 90} 110 98)`}
                  strokeWidth="2.5"
                  className={
                    state === "done"
                      ? "fill-fg stroke-fg"
                      : state === "current"
                        ? "fill-accent stroke-accent"
                        : "fill-none stroke-fg"
                  }
                />
              );
            })}
            <circle cx="110" cy="98" r="9" className="fill-fg" />
          </g>
        </svg>
      </div>
      <figcaption
        className="grid w-full grid-cols-4 text-center text-caption font-semibold text-fg-2"
        aria-hidden="true"
      >
        {STORY_PARTS.map((part, index) => (
          <span
            key={part}
            className={index === partIndex ? "text-accent" : undefined}
          >
            {PART_LABELS[part]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
