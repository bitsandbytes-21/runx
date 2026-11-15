import { CaptionCard, type Mood } from "./CaptionCard";
import { RunControls } from "./RunControls";
import { StopSheet } from "./StopSheet";
import { WindmillPlayer } from "./WindmillPlayer";
import { GLASS_CARD, LARGE_TITLE, PRIMARY_BUTTON, SCREEN } from "./styles";
import { CHECKPOINT_LABELS } from "@/lib/manifest/labels";
import { formatClock } from "@/lib/run/format-clock";
import {
  currentLine,
  remainingSec,
  storyPartIndex,
  type SessionState,
} from "@/lib/session/session-reducer";

export interface RunScreenHandlers {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onKeepRunning: () => void;
  onSave: () => void;
  onFinish: () => void;
  onRetry: () => void;
  onSkipLine: () => void;
  onDone: () => void;
}

interface RunScreenProps extends RunScreenHandlers {
  state: SessionState;
  isDemo?: boolean;
  /** Shown on the summary, e.g. a sign-up prompt after the demo. */
  afterRun?: React.ReactNode;
}

function sceneLabel(state: SessionState): string {
  if (state.track === "signoff") return "Sign-off";
  if (state.track === "finishing") return "Finishing the story";
  return `Scene ${state.entryIndex + 1} of ${state.entries.length}`;
}

function outcomeText(state: SessionState): string {
  if (state.outcome === "complete")
    return "Episode complete. The windmills will remember you.";
  if (state.outcome === "incomplete") {
    return "A line was skipped, so the episode stays in progress. You can hear the ending next run.";
  }
  return state.savedCheckpoint
    ? `Saved at: ${CHECKPOINT_LABELS[state.savedCheckpoint]}.`
    : "Nothing to save yet: your next run starts from the beginning.";
}

export function RunScreen({
  state,
  isDemo,
  afterRun,
  ...handlers
}: RunScreenProps) {
  if (state.phase === "ended") {
    const scenesHeard = state.entries
      .slice(0, state.entryIndex + 1)
      .filter(
        (entry, index) =>
          index < state.entryIndex || state.lineIndex >= entry.lines.length,
      ).length;
    return (
      <main className={SCREEN}>
        <h1 className={LARGE_TITLE}>You were there</h1>
        <section className={`${GLASS_CARD} flex flex-col gap-2`}>
          <p className="text-headline font-semibold">{outcomeText(state)}</p>
          <dl className="grid grid-cols-2 gap-2 text-footnote text-fg-2">
            <dt>Time</dt>
            <dd className="tabular text-right font-num">
              {formatClock(state.clockSec)}
            </dd>
            <dt>Scenes</dt>
            <dd className="tabular text-right font-num">{scenesHeard}</dd>
          </dl>
        </section>
        {afterRun}
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={handlers.onDone}
        >
          Done
        </button>
      </main>
    );
  }

  const isPaused =
    state.phase === "paused" ||
    (state.phase === "stopSheet" && state.returnPhase === "paused");
  const line = currentLine(state);
  const entry = state.entries[state.entryIndex];
  const mood: Mood = isPaused
    ? "paused"
    : state.track === "story" && entry.beat === "charge"
      ? "charge"
      : "speaking";
  const isTurning = state.phase === "playing" && state.isLineActive;

  return (
    <main className={`${SCREEN} gap-4`}>
      {isDemo && (
        <p className="glass self-center rounded-pill px-4 py-1 text-footnote font-semibold">
          Demo · time runs faster, progress stays on this device
        </p>
      )}
      <p className="text-footnote text-fg-2">{sceneLabel(state)}</p>
      <div className="flex flex-col items-center gap-1">
        <p
          role="status"
          className={`glass rounded-pill px-3 py-1 text-footnote font-semibold ${isPaused ? "" : "invisible"}`}
        >
          {isPaused ? "Paused" : ""}
        </p>
        <p
          role="timer"
          className={`tabular font-num text-timer leading-none font-extrabold ${isPaused ? "text-fg-2" : ""}`}
        >
          {formatClock(remainingSec(state))}
        </p>
        <p className="text-footnote text-fg-2">until glory</p>
      </div>
      <WindmillPlayer partIndex={storyPartIndex(state)} isTurning={isTurning} />
      <CaptionCard
        line={line}
        mood={mood}
        error={state.phase === "error" ? state.error : null}
        onRetry={handlers.onRetry}
        onSkipLine={handlers.onSkipLine}
      />
      <div className="mt-auto">
        <RunControls
          isPaused={isPaused}
          onPause={handlers.onPause}
          onResume={handlers.onResume}
          onStop={handlers.onStop}
        />
      </div>
      {(state.phase === "stopSheet" || state.phase === "closing") && (
        <StopSheet
          canFinishNow={state.canFinishNow}
          isClosing={state.phase === "closing"}
          onSave={handlers.onSave}
          onFinish={handlers.onFinish}
          onKeepRunning={handlers.onKeepRunning}
        />
      )}
    </main>
  );
}
