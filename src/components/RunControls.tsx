import { Icon } from "./Icon";

interface RunControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isDisabled?: boolean;
}

// Pause and Stop never move or change size; only Pause's label flips to Resume.
export function RunControls({
  isPaused,
  onPause,
  onResume,
  onStop,
  isDisabled,
}: RunControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={isPaused ? onResume : onPause}
        disabled={isDisabled}
        className="flex h-ctrl items-center justify-center gap-2 rounded-pill bg-tint-bg text-headline font-semibold text-tint-fg shadow-soft disabled:opacity-60"
      >
        <Icon name={isPaused ? "play" : "pause"} />
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={isDisabled}
        className="glass flex h-ctrl items-center justify-center gap-2 rounded-pill text-headline font-semibold text-fg disabled:opacity-60"
      >
        <Icon name="stop" />
        Stop
      </button>
    </div>
  );
}
