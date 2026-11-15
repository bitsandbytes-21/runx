import { CheckpointIdSchema, type CheckpointId } from "@/lib/manifest/schema";
import { DEFAULT_DURATION_MIN, parseDurationParam } from "./durations";

/** The demo plays a 20 minute plan with the clock 10 times faster (FR-11). */
export const DEMO_SPEED = 10;
export const DEMO_DURATION_MIN = 20;
const MAX_TEST_SPEED = 120;

export interface RunOptions {
  durationMin: number;
  isDemo: boolean;
  speed: number;
  /** "silent" reports lines as ended after their length; for E2E runs. */
  audioMode: "html" | "silent";
  isResume: boolean;
  includeRecap: boolean;
  /** Checkpoint to resume from; only set when resuming. */
  fromCheckpoint: CheckpointId | null;
}

interface ParamReader {
  get: (name: string) => string | null;
}

export function parseRunOptions(params: ParamReader): RunOptions {
  const isDemo = params.get("demo") === "1";
  const requestedSpeed = Number(params.get("speed"));
  const testSpeed =
    Number.isInteger(requestedSpeed) &&
    requestedSpeed >= 1 &&
    requestedSpeed <= MAX_TEST_SPEED
      ? requestedSpeed
      : null;
  const from = CheckpointIdSchema.safeParse(params.get("from"));
  const isResume = params.get("resume") === "1" && from.success;
  return {
    durationMin: isDemo
      ? DEMO_DURATION_MIN
      : (parseDurationParam(params.get("min")) ?? DEFAULT_DURATION_MIN),
    isDemo,
    speed: testSpeed ?? (isDemo ? DEMO_SPEED : 1),
    audioMode: params.get("audio") === "silent" ? "silent" : "html",
    isResume,
    includeRecap: isResume && params.get("recap") === "1",
    fromCheckpoint: isResume && from.success ? from.data : null,
  };
}

/** Carries the E2E-only `audio` and `speed` parameters onto the next run URL. */
export function withTestParams(
  from: ParamReader,
  to: URLSearchParams,
): URLSearchParams {
  for (const name of ["audio", "speed"]) {
    const value = from.get(name);
    if (value !== null) to.set(name, value);
  }
  return to;
}
