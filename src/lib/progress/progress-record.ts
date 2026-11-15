import { z } from "zod";
import {
  CheckpointIdSchema,
  type CheckpointId,
  type Manifest,
} from "@/lib/manifest/schema";

export const ProgressStatusSchema = z.enum(["in_progress", "complete"]);

export const ProgressRecordSchema = z.object({
  episodeId: z.string().min(1),
  manifestVersion: z.number().int().positive(),
  checkpoint: CheckpointIdSchema.nullable(),
  status: ProgressStatusSchema,
  lastPlayedAt: z.iso.datetime(),
  lastDurationMin: z.number().int().min(15).max(60).nullable(),
});

export type ProgressRecord = z.infer<typeof ProgressRecordSchema>;

export type ProgressChange =
  | { kind: "checkpoint"; checkpoint: CheckpointId }
  | { kind: "saved"; checkpoint: CheckpointId | null }
  | { kind: "complete" };

export interface ProgressContext {
  episodeId: string;
  manifestVersion: number;
  nowIso: string;
  durationMin: number | null;
}

export type ProgressLoad =
  | { kind: "none" }
  | { kind: "ok"; record: ProgressRecord }
  | { kind: "unreadable"; reason: "corrupted" | "incompatible" };

/** The persistence adapters (localStorage for guests, the API when signed in). */
export interface ProgressStore {
  load: (manifest: Manifest) => Promise<ProgressLoad>;
  save: (record: ProgressRecord) => Promise<void>;
  clear: (episodeId: string) => Promise<void>;
}

/** Saved progress is always a valid checkpoint (or the start, or complete). */
export function applyProgressChange(
  previous: ProgressRecord | null,
  change: ProgressChange,
  ctx: ProgressContext,
): ProgressRecord | null {
  const base = {
    episodeId: ctx.episodeId,
    manifestVersion: ctx.manifestVersion,
    lastPlayedAt: ctx.nowIso,
    lastDurationMin: ctx.durationMin ?? previous?.lastDurationMin ?? null,
  };
  if (change.kind === "complete")
    return { ...base, checkpoint: null, status: "complete" };
  if (change.checkpoint === null) {
    // Stopping before the first checkpoint leaves earlier progress untouched.
    return previous ? { ...previous, lastPlayedAt: ctx.nowIso } : null;
  }
  return { ...base, checkpoint: change.checkpoint, status: "in_progress" };
}

/** Reads unknown saved data (JSON text or an object) safely; never throws. */
export function parseSavedProgress(
  raw: unknown,
  manifest: Manifest,
): ProgressLoad {
  if (raw === null || raw === undefined) return { kind: "none" };
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { kind: "unreadable", reason: "corrupted" };
    }
  }
  const parsed = ProgressRecordSchema.safeParse(value);
  if (!parsed.success || parsed.data.episodeId !== manifest.episodeId) {
    return { kind: "unreadable", reason: "corrupted" };
  }
  const record = parsed.data;
  if (record.manifestVersion === manifest.manifestVersion)
    return { kind: "ok", record };
  // Checkpoint ids are stable across publishes; only a removed checkpoint breaks resume.
  const isStillValid =
    record.checkpoint === null ||
    manifest.scenes.some((scene) => scene.checkpoint === record.checkpoint);
  return isStillValid
    ? {
        kind: "ok",
        record: { ...record, manifestVersion: manifest.manifestVersion },
      }
    : { kind: "unreadable", reason: "incompatible" };
}
