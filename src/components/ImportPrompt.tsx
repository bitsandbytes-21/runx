import { GLASS_BUTTON, GLASS_CARD } from "./styles";

interface ImportPromptProps {
  checkpointLabel: string;
  onImport: () => void;
  onDecline: () => void;
}

export function ImportPrompt({
  checkpointLabel,
  onImport,
  onDecline,
}: ImportPromptProps) {
  return (
    <section
      aria-labelledby="import-title"
      className={`${GLASS_CARD} flex flex-col gap-3`}
    >
      <h2 id="import-title" className="text-title-3 font-bold">
        Import your progress?
      </h2>
      <p className="text-footnote text-fg-2">
        This device has a saved place in the story ({checkpointLabel}). Import
        it into your account to continue on any device.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={GLASS_BUTTON} onClick={onImport}>
          Import
        </button>
        <button type="button" className={GLASS_BUTTON} onClick={onDecline}>
          Not now
        </button>
      </div>
    </section>
  );
}
