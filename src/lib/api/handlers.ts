import { z } from "zod";
import { CheckpointIdSchema } from "@/lib/manifest/schema";
import {
  ProgressStatusSchema,
  type ProgressRecord,
} from "@/lib/progress/progress-record";
import type { ApiDeps } from "./deps";
import {
  episodeNotFound,
  errorResponse,
  fieldErrors,
  readJson,
  unauthenticated,
} from "./responses";

const ProgressBodySchema = z
  .object({
    checkpoint: CheckpointIdSchema.nullable(),
    status: ProgressStatusSchema,
    lastDurationMin: z.number().int().min(15).max(60).nullable().optional(),
  })
  .superRefine((body, ctx) => {
    if (body.status === "in_progress" && body.checkpoint === null) {
      ctx.addIssue({
        code: "custom",
        path: ["checkpoint"],
        message: "In-progress saves need a checkpoint",
      });
    }
    if (body.status === "complete" && body.checkpoint !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["checkpoint"],
        message: "A complete episode has no checkpoint",
      });
    }
  });

export async function listEpisodes(deps: ApiDeps): Promise<Response> {
  const manifests = await deps.episodes.listPublished();
  return Response.json(
    manifests.map((m) => ({
      id: m.episodeId,
      title: m.title,
      manifestVersion: m.manifestVersion,
      sceneCount: m.scenes.length,
    })),
  );
}

export async function getEpisode(
  deps: ApiDeps,
  _request: Request,
  episodeId: string,
): Promise<Response> {
  const manifest = await deps.episodes.getPublished(episodeId);
  return manifest ? Response.json(manifest) : episodeNotFound(episodeId);
}

export async function getEpisodeScenes(
  deps: ApiDeps,
  _request: Request,
  episodeId: string,
): Promise<Response> {
  const manifest = await deps.episodes.getPublished(episodeId);
  if (!manifest) return episodeNotFound(episodeId);
  return Response.json([...manifest.scenes].sort((a, b) => a.order - b.order));
}

export async function getProgress(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const user = await deps.authenticate(request);
  if (!user) return unauthenticated();
  const record = await user.progress.get(episodeId);
  return record
    ? Response.json(record)
    : errorResponse(404, "not_found", "No saved progress for this episode");
}

export async function putProgress(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const user = await deps.authenticate(request);
  if (!user) return unauthenticated();
  const json = await readJson(request);
  if (!json.ok)
    return errorResponse(400, "invalid_input", "The body must be JSON", {
      fields: { body: "Invalid JSON" },
    });
  const parsed = ProgressBodySchema.safeParse(json.value);
  if (!parsed.success) {
    return errorResponse(400, "invalid_input", "The progress is not valid", {
      fields: fieldErrors(parsed.error.issues),
    });
  }
  const manifest = await deps.episodes.getPublished(episodeId);
  if (!manifest) return episodeNotFound(episodeId);
  const { checkpoint, status, lastDurationMin } = parsed.data;
  if (
    checkpoint &&
    !manifest.scenes.some((scene) => scene.checkpoint === checkpoint)
  ) {
    return errorResponse(400, "invalid_input", "The progress is not valid", {
      fields: {
        checkpoint: `Episode ${episodeId} has no checkpoint ${checkpoint}`,
      },
    });
  }
  const record: ProgressRecord = {
    episodeId,
    manifestVersion: manifest.manifestVersion,
    checkpoint,
    status,
    lastPlayedAt: deps.now().toISOString(),
    lastDurationMin: lastDurationMin ?? null,
  };
  await user.progress.upsert(record);
  return Response.json(record);
}

export async function deleteProgress(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const user = await deps.authenticate(request);
  if (!user) return unauthenticated();
  await user.progress.remove(episodeId);
  return new Response(null, { status: 204 });
}

export async function getMe(
  deps: ApiDeps,
  request: Request,
): Promise<Response> {
  const user = await deps.authenticate(request);
  if (!user) return unauthenticated();
  return Response.json({ userId: user.userId, role: user.role });
}
