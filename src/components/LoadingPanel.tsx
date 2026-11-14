import { GLASS_BUTTON, GLASS_CARD, PRIMARY_BUTTON, SCREEN } from "./styles";

interface LoadingPanelProps {
  done: number;
  total: number;
  error?: string | null;
  onRetry?: () => void;
  onCancel: () => void;
}

// The clock does not start until every clip of the run is on the device.
export function LoadingPanel({
  done,
  total,
  error,
  onRetry,
  onCancel,
}: LoadingPanelProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <main className={`${SCREEN} justify-center`}>
      <section className={`${GLASS_CARD} flex flex-col gap-3`}>
        <h1 className="text-title-3 font-bold">Saddling Rocinante</h1>
        <div
          role="progressbar"
          aria-label="Loading the story"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-pill bg-segment-track"
        >
          <div
            className="h-full rounded-pill bg-accent"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="tabular text-footnote text-fg-2">
          {done} of {total} clips
        </p>
        {error && (
          <div role="alert" className="flex flex-col gap-3">
            <p className="text-footnote text-error">
              {error}. The clock has not started.
            </p>
            <button type="button" className={PRIMARY_BUTTON} onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
        <button type="button" className={GLASS_BUTTON} onClick={onCancel}>
          Cancel
        </button>
      </section>
    </main>
  );
}
