import type { CheckpointId, Speaker, StoryPart } from "./schema";

export const CHECKPOINT_LABELS: Record<CheckpointId, string> = {
  CP1: "After the departure",
  CP2: "Windmills on the horizon",
  CP3: "Facing the windmills",
};

export const PART_LABELS: Record<StoryPart, string> = {
  warmup: "Warm-up",
  rising: "Rising",
  climax: "Climax",
  epilogue: "Epilogue",
};

export const SPEAKER_NAMES: Record<Speaker, string> = {
  quixote: "Don Quixote",
  sancho: "Sancho",
};
