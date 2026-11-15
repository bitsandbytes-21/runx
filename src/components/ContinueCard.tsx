import Link from "next/link";
import { RecapBubbles } from "./RecapBubbles";
import { GLASS_BUTTON, GLASS_CARD } from "./styles";
import type { Manifest } from "@/lib/manifest/schema";
import { CHECKPOINT_LABELS } from "@/lib/manifest/labels";
import type { ProgressLoad } from "@/lib/progress/progress-record";
import { recapPreview } from "@/lib/progress/resume";

interface ContinueCardProps {
  manifest: Manifest;
  load: ProgressLoad;
  onRestart: () => void;
}

export function ContinueCard({ manifest, load, onRestart }: ContinueCardProps) {
  if (load.kind === "none") return null;
  if (load.kind === "unreadable") {
    return (
      <section role="alert" className={`${GLASS_CARD} flex flex-col gap-3`}>
        <p className="text-headline font-semibold">
          Saved progress could not be read
        </p>
        <p className="text-footnote text-fg-2">
          {load.reason === "incompatible"
            ? "The episode changed since your last run."
            : "The saved data is damaged."}{" "}
          Restart to begin the episode again.
        </p>
        <button type="button" className={GLASS_BUTTON} onClick={onRestart}>
          Restart
        </button>
      </section>
    );
  }
  const { record } = load;
  if (record.status === "complete" || record.checkpoint === null) {
    return (
      <p className={`${GLASS_CARD} text-footnote text-fg-2`}>
        You finished this episode. Ride out to hear it again from the start.
      </p>
    );
  }
  const recapLine = recapPreview(manifest, record.checkpoint)[1];
  return (
    <section
      aria-labelledby="continue-title"
      className={`${GLASS_CARD} flex flex-col gap-3`}
    >
      <div>
        <p className="text-footnote text-fg-2">Continue</p>
        <h2 id="continue-title" className="text-title-3 font-bold">
          {CHECKPOINT_LABELS[record.checkpoint]}
        </h2>
      </div>
      {recapLine && <RecapBubbles lines={[recapLine]} />}
      <Link href="/resume" className={GLASS_BUTTON}>
        Continue the story
      </Link>
    </section>
  );
}
