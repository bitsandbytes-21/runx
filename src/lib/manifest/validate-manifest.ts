import { CLIMAX_WINDOW_SEC, MIN_GAP_SEC } from "@/lib/scheduler/constants";
import {
  CHECKPOINT_IDS,
  ManifestSchema,
  type Line,
  type Manifest,
  type Scene,
  type SceneType,
} from "./schema";

export type ManifestErrorCode =
  | "invalid_shape"
  | "duplicate_id"
  | "missing_audio"
  | "negative_duration"
  | "missing_transcript"
  | "unknown_prerequisite"
  | "dependency_cycle"
  | "prerequisite_order"
  | "missing_scene_type"
  | "duplicate_scene_type"
  | "duplicate_checkpoint"
  | "missing_checkpoint"
  | "missing_compressed_ending"
  | "missing_recap"
  | "climax_too_long";

export interface ManifestError {
  code: ManifestErrorCode;
  message: string;
  sceneId?: string;
}

export type ManifestValidation =
  { ok: true; manifest: Manifest } | { ok: false; errors: ManifestError[] };

const SINGLE_SCENE_TYPES: SceneType[] = ["opening", "climax", "ending"];

function sceneError(
  code: ManifestErrorCode,
  scene: Scene,
  detail: string,
): ManifestError {
  return { code, sceneId: scene.id, message: `Scene ${scene.id}: ${detail}` };
}

function spokenLines(scene: Scene): Line[] {
  return scene.bridge ? [...scene.lines, scene.bridge] : scene.lines;
}

function checkIds(scenes: Scene[]): ManifestError[] {
  const errors: ManifestError[] = [];
  const sceneIds = new Set<string>();
  const lineIds = new Set<string>();
  for (const scene of scenes) {
    if (sceneIds.has(scene.id)) {
      errors.push(sceneError("duplicate_id", scene, "the id is used twice"));
    }
    sceneIds.add(scene.id);
    for (const line of spokenLines(scene)) {
      if (lineIds.has(line.id)) {
        errors.push(
          sceneError("duplicate_id", scene, `line id ${line.id} is used twice`),
        );
      }
      lineIds.add(line.id);
    }
  }
  return errors;
}

function checkContent(scene: Scene): ManifestError[] {
  const errors: ManifestError[] = [];
  const lines = spokenLines(scene);
  if (scene.lines.length === 0 || lines.some((line) => !line.text.trim())) {
    errors.push(
      sceneError("missing_transcript", scene, "every line needs caption text"),
    );
  }
  if (lines.some((line) => !line.audioUrl.trim())) {
    errors.push(sceneError("missing_audio", scene, "a line has no audio file"));
  }
  if (scene.durationSec <= 0 || lines.some((line) => line.durationSec <= 0)) {
    errors.push(
      sceneError("negative_duration", scene, "durations must be above zero"),
    );
  }
  return errors;
}

function checkPrerequisites(scenes: Scene[]): ManifestError[] {
  const errors: ManifestError[] = [];
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  for (const scene of scenes) {
    for (const prerequisite of scene.prerequisites) {
      const target = byId.get(prerequisite);
      if (!target) {
        errors.push(
          sceneError(
            "unknown_prerequisite",
            scene,
            `prerequisite ${prerequisite} does not exist`,
          ),
        );
      } else if (target.order > scene.order) {
        errors.push(
          sceneError(
            "prerequisite_order",
            scene,
            `prerequisite ${prerequisite} comes later in story order`,
          ),
        );
      }
    }
  }
  return [...errors, ...findCycles(scenes, byId)];
}

function findCycles(
  scenes: Scene[],
  byId: Map<string, Scene>,
): ManifestError[] {
  const errors: ManifestError[] = [];
  const done = new Set<string>();
  const onPath = new Set<string>();

  // Depth-first search; reaching a scene already on the current path is a cycle.
  function visit(scene: Scene): boolean {
    if (onPath.has(scene.id)) return true;
    if (done.has(scene.id)) return false;
    onPath.add(scene.id);
    const hasCycle = scene.prerequisites.some((id) => {
      const next = byId.get(id);
      return next ? visit(next) : false;
    });
    onPath.delete(scene.id);
    done.add(scene.id);
    return hasCycle;
  }

  for (const scene of scenes) {
    onPath.clear();
    if (!done.has(scene.id) && visit(scene)) {
      errors.push(
        sceneError("dependency_cycle", scene, "prerequisites form a cycle"),
      );
    }
  }
  return errors;
}

function checkStructure(scenes: Scene[]): ManifestError[] {
  const errors: ManifestError[] = [];
  for (const type of [...SINGLE_SCENE_TYPES, "signoff" as const]) {
    const count = scenes.filter((scene) => scene.type === type).length;
    if (count === 0) {
      errors.push({
        code: "missing_scene_type",
        message: `The episode needs a scene of type ${type}`,
      });
    }
    if (count > 1 && type !== "signoff") {
      errors.push({
        code: "duplicate_scene_type",
        message: `The episode has ${count} scenes of type ${type}; it needs one`,
      });
    }
  }

  for (const checkpoint of CHECKPOINT_IDS) {
    const holders = scenes.filter((scene) => scene.checkpoint === checkpoint);
    if (holders.length === 0) {
      errors.push({
        code: "missing_checkpoint",
        message: `No scene reaches checkpoint ${checkpoint}`,
      });
    } else if (holders.length > 1) {
      errors.push({
        code: "duplicate_checkpoint",
        message: `Checkpoint ${checkpoint} is reached by ${holders.map((s) => s.id).join(", ")}`,
      });
    }
    const hasEnding = scenes.some(
      (s) => s.type === "compressed_ending" && s.forCheckpoint === checkpoint,
    );
    if (!hasEnding) {
      errors.push({
        code: "missing_compressed_ending",
        message: `Checkpoint ${checkpoint} has no compressed ending`,
      });
    }
    const hasRecap = scenes.some(
      (s) => s.type === "recap" && s.forCheckpoint === checkpoint,
    );
    if (!hasRecap) {
      errors.push({
        code: "missing_recap",
        message: `Checkpoint ${checkpoint} has no recap`,
      });
    }
  }

  const climax = scenes.find((scene) => scene.type === "climax");
  const ending = scenes.find((scene) => scene.type === "ending");
  if (climax && ending) {
    const blockSec = climax.durationSec + MIN_GAP_SEC + ending.durationSec;
    if (blockSec > CLIMAX_WINDOW_SEC) {
      errors.push(
        sceneError(
          "climax_too_long",
          climax,
          `climax and ending need ${Math.ceil(blockSec)} s; the last ${CLIMAX_WINDOW_SEC} s is the limit`,
        ),
      );
    }
  }
  return errors;
}

/** Validates unknown input (JSON, database rows, editor drafts) as a manifest. */
export function validateManifest(input: unknown): ManifestValidation {
  const parsed = ManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        code: "invalid_shape",
        message: `${issue.path.join(".") || "manifest"}: ${issue.message}`,
      })),
    };
  }
  const { scenes } = parsed.data;
  const errors = [
    ...checkIds(scenes),
    ...scenes.flatMap(checkContent),
    ...checkPrerequisites(scenes),
    ...checkStructure(scenes),
  ];
  return errors.length === 0
    ? { ok: true, manifest: parsed.data }
    : { ok: false, errors };
}
