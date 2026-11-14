export const DURATION_PRESETS_MIN = [20, 30, 45] as const;
export const DEFAULT_DURATION_MIN = 30;
export const CUSTOM_DURATION_MIN = 15;
export const CUSTOM_DURATION_MAX = 60;
export const CUSTOM_DURATION_STEP = 5;

export const CUSTOM_DURATION_OPTIONS_MIN: readonly number[] = Array.from(
  {
    length:
      (CUSTOM_DURATION_MAX - CUSTOM_DURATION_MIN) / CUSTOM_DURATION_STEP + 1,
  },
  (_, index) => CUSTOM_DURATION_MIN + index * CUSTOM_DURATION_STEP,
);

/** Interviews showed 25 and 41 minute runs; 5 minute steps keep the menu short. */
export function isValidDuration(durationMin: number): boolean {
  return CUSTOM_DURATION_OPTIONS_MIN.includes(durationMin);
}

export function parseDurationParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const durationMin = Number(value);
  return isValidDuration(durationMin) ? durationMin : null;
}

/** Shortest allowed length of at least `minDurationMin`, or null if none fits. */
export function nextFittingDuration(minDurationMin: number): number | null {
  return (
    CUSTOM_DURATION_OPTIONS_MIN.find((option) => option >= minDurationMin) ??
    null
  );
}

export function finishTime(
  nowMs: number,
  durationMin: number,
  format: { locale?: string; timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(format.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: format.timeZone,
  }).format(nowMs + durationMin * 60_000);
}
