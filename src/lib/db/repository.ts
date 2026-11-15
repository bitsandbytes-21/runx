import type { Manifest, Scene } from "@/lib/manifest/schema";
import type { ProgressRecord } from "@/lib/progress/progress-record";

/** Published episodes; readable by anyone. */
export interface EpisodeRepository {
  listPublished: () => Promise<Manifest[]>;
  getPublished: (episodeId: string) => Promise<Manifest | null>;
}

/** Progress of the signed-in user only (row-level security enforces it too). */
export interface ProgressRepository {
  get: (episodeId: string) => Promise<ProgressRecord | null>;
  upsert: (record: ProgressRecord) => Promise<void>;
  remove: (episodeId: string) => Promise<void>;
}

/** Draft scenes and publishing; only editors pass RLS. */
export interface EditorRepository {
  getDraft: (episodeId: string) => Promise<Manifest | null>;
  saveScene: (episodeId: string, scene: Scene) => Promise<void>;
  reorder: (episodeId: string, sceneIds: string[]) => Promise<void>;
  publish: (manifest: Manifest) => Promise<void>;
}
