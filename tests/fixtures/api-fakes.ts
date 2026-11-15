import type { Manifest } from "@/lib/manifest/schema";
import type { ProgressRecord } from "@/lib/progress/progress-record";
import type { ApiDeps, RequestUser } from "@/lib/api/deps";
import type {
  EditorRepository,
  EpisodeRepository,
  ProgressRepository,
} from "@/lib/db/repository";
import { makeManifest } from "./manifest-fixture";

export function memoryEpisodes(
  manifests: Manifest[] = [makeManifest()],
): EpisodeRepository {
  return {
    listPublished: async () => manifests,
    getPublished: async (id) =>
      manifests.find((m) => m.episodeId === id) ?? null,
  };
}

/** One shared table; each user only reaches their own rows, like RLS. */
export function memoryProgress(table = new Map<string, ProgressRecord>()) {
  const forUser = (userId: string): ProgressRepository => ({
    get: async (episodeId) => table.get(`${userId}:${episodeId}`) ?? null,
    upsert: async (record) =>
      void table.set(`${userId}:${record.episodeId}`, record),
    remove: async (episodeId) => void table.delete(`${userId}:${episodeId}`),
  });
  return { table, forUser };
}

export function memoryEditor(
  manifest: Manifest = makeManifest(),
): EditorRepository & { published: Manifest[] } {
  let drafts = structuredClone(manifest.scenes);
  let version = manifest.manifestVersion;
  const published: Manifest[] = [];
  return {
    published,
    getDraft: async (episodeId) =>
      episodeId === manifest.episodeId
        ? {
            ...manifest,
            manifestVersion: version,
            scenes: structuredClone(drafts),
          }
        : null,
    saveScene: async (_episodeId, scene) => {
      const index = drafts.findIndex((s) => s.id === scene.id);
      if (index === -1) drafts.push(scene);
      else drafts[index] = scene;
    },
    reorder: async (_episodeId, ids) => {
      drafts = ids.map((id, index) => ({
        ...drafts.find((s) => s.id === id)!,
        order: index + 1,
      }));
    },
    publish: async (next) => {
      version = next.manifestVersion;
      published.push(next);
    },
  };
}

export function fakeDeps(
  options: {
    users?: Record<string, RequestUser["role"]>;
    manifests?: Manifest[];
  } = {},
) {
  const progress = memoryProgress();
  const editor = memoryEditor(options.manifests?.[0]);
  const users = options.users ?? {
    "token-runner": "runner",
    "token-other": "runner",
    "token-editor": "editor",
  };
  const deps: ApiDeps = {
    episodes: memoryEpisodes(options.manifests),
    authenticate: async (request) => {
      const token = request.headers
        .get("authorization")
        ?.replace(/^Bearer /, "");
      const role = token ? users[token] : undefined;
      if (!token || !role) return null;
      return { userId: token, role, progress: progress.forUser(token), editor };
    },
    now: () => new Date("2026-11-14T10:00:00.000Z"),
  };
  return { deps, progress, editor };
}

export function request(
  path: string,
  init: RequestInit & { token?: string } = {},
): Request {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`http://localhost${path}`, { ...init, headers });
}
