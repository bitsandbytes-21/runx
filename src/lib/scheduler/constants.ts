/** The climax must start inside this window before the end of the run. */
export const CLIMAX_WINDOW_SEC = 180;

/** Shortest silence between two scenes, so lines never run into each other. */
export const MIN_GAP_SEC = 3;

/** A bridge line is spoken before any silence at least this long. */
export const LONG_GAP_SEC = 45;

/** Uninterrupted runs must end within this tolerance of the chosen length. */
export const END_TOLERANCE_SEC = 15;

/** Encouragement beats as a share of the run (script-style-guide §4). */
export const MIDPOINT_SHARE = 0.475;
export const SECOND_PUSH_SHARE = 0.7;

/** The second push is only scheduled for runs at least this long. */
export const SECOND_PUSH_MIN_DURATION_SEC = 30 * 60;
