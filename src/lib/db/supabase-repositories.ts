import type { SupabaseClient } from "@supabase/supabase-js";
import type { Manifest, Scene } from "@/lib/manifest/schema";
import { SceneSchema } from "@/lib/manifest/schema";
import { validateManifest } from "@/lib/manifest/validate-manifest";
import {
  ProgressRecordSchema,
  type ProgressRecord,
} from "@/lib/progress/progress-record";
import type { Role } from "@/lib/api/deps";
import type {
  EditorRepository,
  EpisodeRepository,
  ProgressRepository,
} from "./repository";

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

/** Snapshots are validated again on read: the database is an external boundary. */
function validManifests(rows: { published_manifest: unknown }[]): Manifest[] {
  return rows.flatMap((row) => {
    const result = validateManifest(row.published_manifest);
    return result.ok ? [result.manifest] : [];
  });
}

export function supabaseEpisodes(client: SupabaseClient): EpisodeRepository {
  return {
    async listPublished() {
      const { data, error } = await client
        .from("episodes")
        .select("published_manifest")
        .not("published_manifest", "is", null)
        .order("id");
      if (error) fail("List episodes", error);
      return validManifests(data ?? []);
    },
    async getPublished(episodeId) {
      const { data, error } = await client
        .from("episodes")
        .select("published_manifest")
        .eq("id", episodeId)
        .not("published_manifest", "is", null)
        .maybeSingle();
      if (error) fail("Get episode", error);
      return data ? (validManifests([data])[0] ?? null) : null;
    },
  };
}

interface ProgressRow {
  episode_id: string;
  manifest_version: number;
  checkpoint: string | null;
  status: string;
  last_played_at: string;
  last_duration_min: number | null;
}

function toIsoOrRaw(value: string): string {
  const time = Date.parse(value);
  // Postgres returns "+00:00" offsets; an unparsable value is left for the schema to reject.
  return Number.isFinite(time) ? new Date(time).toISOString() : value;
}

function toRecord(row: ProgressRow): ProgressRecord | null {
  const parsed = ProgressRecordSchema.safeParse({
    episodeId: row.episode_id,
    manifestVersion: row.manifest_version,
    checkpoint: row.checkpoint,
    status: row.status,
    lastPlayedAt: toIsoOrRaw(String(row.last_played_at)),
    lastDurationMin: row.last_duration_min,
  });
  return parsed.success ? parsed.data : null;
}

export function supabaseProgress(
  client: SupabaseClient,
  userId: string,
): ProgressRepository {
  return {
    async get(episodeId) {
      const { data, error } = await client
        .from("progress")
        .select("*")
        .eq("user_id", userId)
        .eq("episode_id", episodeId)
        .maybeSingle();
      if (error) fail("Get progress", error);
      return data ? toRecord(data as ProgressRow) : null;
    },
    async upsert(record) {
      const { error } = await client.from("progress").upsert(
        {
          user_id: userId,
          episode_id: record.episodeId,
          manifest_version: record.manifestVersion,
          checkpoint: record.checkpoint,
          status: record.status,
          last_played_at: record.lastPlayedAt,
          last_duration_min: record.lastDurationMin,
          updated_at: record.lastPlayedAt,
        },
        { onConflict: "user_id,episode_id" },
      );
      if (error) fail("Save progress", error);
    },
    async remove(episodeId) {
      const { error } = await client
        .from("progress")
        .delete()
        .eq("user_id", userId)
        .eq("episode_id", episodeId);
      if (error) fail("Delete progress", error);
    },
  };
}

interface SceneRow {
  id: string;
  position: number;
  type: string;
  title: string;
  part: string;
  duration_sec: number | string;
  required: boolean;
  prerequisites: string[];
  checkpoint: string | null;
  for_checkpoint: string | null;
  beat: string | null;
  source: string;
  lines: unknown;
  bridge: unknown;
}

function toScene(row: SceneRow): Scene | null {
  const parsed = SceneSchema.safeParse({
    id: row.id,
    type: row.type,
    order: row.position,
    title: row.title,
    part: row.part,
    durationSec: Number(row.duration_sec),
    required: row.required,
    prerequisites: row.prerequisites,
    checkpoint: row.checkpoint,
    forCheckpoint: row.for_checkpoint,
    beat: row.beat,
    source: row.source,
    lines: row.lines,
    bridge: row.bridge,
  });
  return parsed.success ? parsed.data : null;
}

function toSceneRow(episodeId: string, scene: Scene) {
  return {
    episode_id: episodeId,
    id: scene.id,
    position: scene.order,
    type: scene.type,
    title: scene.title,
    part: scene.part,
    duration_sec: scene.durationSec,
    required: scene.required,
    prerequisites: scene.prerequisites,
    checkpoint: scene.checkpoint,
    for_checkpoint: scene.forCheckpoint,
    beat: scene.beat,
    source: scene.source,
    lines: scene.lines,
    bridge: scene.bridge,
    updated_at: new Date().toISOString(),
  };
}

export function supabaseEditor(client: SupabaseClient): EditorRepository {
  return {
    async getDraft(episodeId) {
      const { data: episode, error } = await client
        .from("episodes")
        .select("id, title, manifest_version")
        .eq("id", episodeId)
        .maybeSingle();
      if (error) fail("Get episode", error);
      if (!episode) return null;
      const { data: rows, error: scenesError } = await client
        .from("scenes")
        .select("*")
        .eq("episode_id", episodeId)
        .order("position");
      if (scenesError) fail("List scenes", scenesError);
      return {
        episodeId: episode.id,
        title: episode.title,
        manifestVersion: episode.manifest_version,
        scenes: (rows ?? []).flatMap((row) => toScene(row as SceneRow) ?? []),
      };
    },
    async saveScene(episodeId, scene) {
      const { error } = await client
        .from("scenes")
        .upsert(toSceneRow(episodeId, scene), { onConflict: "episode_id,id" });
      if (error) fail("Save scene", error);
    },
    async reorder(episodeId, sceneIds) {
      for (const [index, id] of sceneIds.entries()) {
        const { error } = await client
          .from("scenes")
          .update({ position: index + 1 })
          .eq("episode_id", episodeId)
          .eq("id", id);
        if (error) fail("Reorder scenes", error);
      }
    },
    async publish(manifest) {
      const { error } = await client
        .from("episodes")
        .update({
          published_manifest: manifest,
          manifest_version: manifest.manifestVersion,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", manifest.episodeId);
      if (error) fail("Publish episode", error);
    },
  };
}

export async function readRole(
  client: SupabaseClient,
  userId: string,
): Promise<Role> {
  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail("Read role", error);
  return data?.role === "editor" ? "editor" : "runner";
}
