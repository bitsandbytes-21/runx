import Image from "next/image";
import type { Line } from "@/lib/manifest/schema";
import { SPEAKER_NAMES } from "@/lib/manifest/labels";

const RECAP_EXPRESSION = { quixote: "dreamy", sancho: "exasperated" } as const;

// Quixote on the left in a white bubble, Sancho on the right in a tint bubble.
export function RecapBubbles({ lines }: { lines: Line[] }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Previously">
      {lines.map((line) => {
        const isQuixote = line.speaker === "quixote";
        return (
          <li
            key={line.id}
            className={`flex items-end gap-2 ${isQuixote ? "" : "flex-row-reverse"}`}
          >
            <Image
              src={`/characters/${line.speaker}/dream/${RECAP_EXPRESSION[line.speaker]}.webp`}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="size-10 rounded-pill"
            />
            <p
              className={`max-w-[75%] rounded-group px-3 py-2 text-footnote ${isQuixote ? "bg-tint-bg text-label" : "bg-tint-fg text-fg"}`}
            >
              <span className="sr-only">{SPEAKER_NAMES[line.speaker]}: </span>
              {line.text}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
