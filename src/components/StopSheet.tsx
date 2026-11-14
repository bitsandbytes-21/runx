import Image from "next/image";
import { Icon, type IconName } from "./Icon";

interface StopSheetProps {
  canFinishNow: boolean;
  /** A choice was made and the current line is still finishing. */
  isClosing?: boolean;
  onSave: () => void;
  onFinish: () => void;
  onKeepRunning: () => void;
}

interface Row {
  title: string;
  subtitle: string;
  icon: IconName;
  tile: string;
  onClick: () => void;
}

export function StopSheet({
  canFinishNow,
  isClosing,
  onSave,
  onFinish,
  onKeepRunning,
}: StopSheetProps) {
  // Safest to boldest (DESIGN.md). Finish now needs a checkpoint, so it is
  // hidden until the opening scene has ended.
  const rows: Row[] = [
    {
      title: "Save for next time",
      subtitle: "A short goodbye, then we pick up here next run",
      icon: "save",
      tile: "bg-sys-blue",
      onClick: onSave,
    },
    ...(canFinishNow
      ? [
          {
            title: "Finish the story now",
            subtitle: "A quick ending, about a minute",
            icon: "finish" as const,
            tile: "bg-sys-green",
            onClick: onFinish,
          },
        ]
      : []),
    {
      title: "Keep running",
      subtitle: "Back to the story where you left it",
      icon: "run",
      tile: "bg-sys-gray",
      onClick: onKeepRunning,
    },
  ];
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-title"
        className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-t-sheet bg-sheet px-4 pb-8 pt-2 text-label backdrop-blur-xl"
      >
        <div
          aria-hidden="true"
          className="mx-auto h-[5px] w-[38px] rounded-pill bg-separator"
        />
        <div className="flex items-center gap-3">
          <Image
            src="/characters/sancho/dream/worried.webp"
            alt=""
            aria-hidden="true"
            width={60}
            height={60}
            className="size-15 rounded-pill"
          />
          <div>
            <h2 id="stop-title" className="text-title-2 font-bold">
              Retreat for now?
            </h2>
            <p className="text-footnote text-label-2">
              {isClosing
                ? "Sancho is finishing the current line first."
                : "Stopping is always fine. The story waits for you."}
            </p>
          </div>
        </div>
        <ul className="overflow-hidden rounded-group bg-tint-bg">
          {rows.map((row) => (
            <li
              key={row.title}
              className="border-b border-separator last:border-b-0"
            >
              <button
                type="button"
                onClick={row.onClick}
                disabled={isClosing}
                className="flex min-h-row w-full items-center gap-3 px-4 text-left disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-8 items-center justify-center rounded-tile text-fg ${row.tile}`}
                >
                  <Icon name={row.icon} className="size-5" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span data-row-title className="text-headline font-semibold">
                    {row.title}
                  </span>
                  <span className="text-footnote text-label-2">
                    {row.subtitle}
                  </span>
                </span>
                <Icon name="chevron" className="size-5 text-label-2" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
