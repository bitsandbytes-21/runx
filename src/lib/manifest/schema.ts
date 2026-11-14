import { z } from "zod";

export const SCENE_TYPES = [
  "opening",
  "core",
  "optional",
  "climax",
  "ending",
  "signoff",
  "recap",
  "compressed_ending",
] as const;

export const CHECKPOINT_IDS = ["CP1", "CP2", "CP3"] as const;
export const STORY_PARTS = ["warmup", "rising", "climax", "epilogue"] as const;
export const SPEAKERS = ["quixote", "sancho"] as const;
export const BEATS = ["encourage", "charge"] as const;

export const SceneTypeSchema = z.enum(SCENE_TYPES);
export const CheckpointIdSchema = z.enum(CHECKPOINT_IDS);
export const StoryPartSchema = z.enum(STORY_PARTS);
export const SpeakerSchema = z.enum(SPEAKERS);
export const BeatSchema = z.enum(BEATS);

// Numbers and strings are only shape-checked here; validateManifest reports
// content problems (negative durations, missing audio) with specific codes.
export const LineSchema = z.object({
  id: z.string().min(1),
  speaker: SpeakerSchema,
  text: z.string(),
  audioUrl: z.string(),
  durationSec: z.number(),
});

export const SceneSchema = z.object({
  id: z.string().min(1),
  type: SceneTypeSchema,
  order: z.number().int(),
  title: z.string(),
  part: StoryPartSchema,
  durationSec: z.number(),
  required: z.boolean(),
  prerequisites: z.array(z.string()),
  // The checkpoint reached once this scene has fully played.
  checkpoint: CheckpointIdSchema.nullable(),
  // For recap and compressed_ending scenes: the checkpoint they belong to.
  forCheckpoint: CheckpointIdSchema.nullable(),
  beat: BeatSchema.nullable(),
  source: z.string(),
  lines: z.array(LineSchema),
  // Spoken only when a long silence follows the scene.
  bridge: LineSchema.nullable(),
});

export const ManifestSchema = z.object({
  episodeId: z.string().min(1),
  manifestVersion: z.number().int().positive(),
  title: z.string().min(1),
  scenes: z.array(SceneSchema),
});

export type SceneType = z.infer<typeof SceneTypeSchema>;
export type CheckpointId = z.infer<typeof CheckpointIdSchema>;
export type StoryPart = z.infer<typeof StoryPartSchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Line = z.infer<typeof LineSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

/** Scene types that make up the main story line, played in `order`. */
export const STORY_SCENE_TYPES: readonly SceneType[] = [
  "opening",
  "core",
  "optional",
  "climax",
  "ending",
];

export function isStoryScene(scene: Scene): boolean {
  return STORY_SCENE_TYPES.includes(scene.type) && scene.beat !== "encourage";
}

export function isEncouragement(scene: Scene): boolean {
  return scene.beat === "encourage";
}
