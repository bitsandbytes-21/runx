import { z } from "zod";
import { SceneSchema } from "@/lib/manifest/schema";
import { validateManifest } from "@/lib/manifest/validate-manifest";
import type { ApiDeps, RequestUser } from "./deps";
import {
  episodeNotFound,
  errorResponse,
  fieldErrors,
  forbidden,
  readJson,
  unauthenticated,
} from "./responses";

type Guarded =
  { ok: true; user: RequestUser } | { ok: false; response: Response };

/** The role is checked on the server for every editor call; RLS checks it again. */
async function requireEditor(
  deps: ApiDeps,
  request: Request,
): Promise<Guarded> {
  const user = await deps.authenticate(request);
  if (!user) return { ok: false, response: unauthenticated() };
  if (user.role !== "editor") return { ok: false, response: forbidden() };
  return { ok: true, user };
}

function problemsOf(input: unknown) {
  const result = validateManifest(input);
  return result.ok ? [] : result.errors;
}

export async function getDraftScenes(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const guard = await requireEditor(deps, request);
  if (!guard.ok) return guard.response;
  const manifest = await guard.user.editor.getDraft(episodeId);
  if (!manifest) return episodeNotFound(episodeId);
  const scenes = [...manifest.scenes].sort((a, b) => a.order - b.order);
  return Response.json({
    manifest: { ...manifest, scenes },
    problems: problemsOf(manifest),
  });
}

/** Creates the scene when the id is new, otherwise replaces it. */
export async function saveScene(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
  sceneId: string,
): Promise<Response> {
  const guard = await requireEditor(deps, request);
  if (!guard.ok) return guard.response;
  const json = await readJson(request);
  if (!json.ok)
    return errorResponse(400, "invalid_input", "The body must be JSON", {
      fields: { body: "Invalid JSON" },
    });
  const parsed = SceneSchema.safeParse(json.value);
  if (!parsed.success) {
    return errorResponse(400, "invalid_input", "The scene is not valid", {
      fields: fieldErrors(parsed.error.issues),
    });
  }
  if (parsed.data.id !== sceneId) {
    return errorResponse(
      400,
      "invalid_input",
      "The scene id does not match the URL",
      { fields: { id: "Must match the URL" } },
    );
  }
  if (!(await guard.user.editor.getDraft(episodeId)))
    return episodeNotFound(episodeId);
  await guard.user.editor.saveScene(episodeId, parsed.data);
  return Response.json(parsed.data);
}

const OrderSchema = z.object({ sceneIds: z.array(z.string().min(1)) });

export async function putSceneOrder(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const guard = await requireEditor(deps, request);
  if (!guard.ok) return guard.response;
  const json = await readJson(request);
  const parsed = json.ok ? OrderSchema.safeParse(json.value) : null;
  if (!parsed?.success) {
    return errorResponse(400, "invalid_input", "Send { sceneIds: string[] }", {
      fields: { sceneIds: "Required" },
    });
  }
  const draft = await guard.user.editor.getDraft(episodeId);
  if (!draft) return episodeNotFound(episodeId);
  const current = draft.scenes.map((scene) => scene.id).sort();
  const proposed = [...parsed.data.sceneIds].sort();
  if (
    current.length !== proposed.length ||
    current.some((id, index) => id !== proposed[index])
  ) {
    return errorResponse(
      400,
      "invalid_input",
      "The order must list every scene exactly once",
      {
        fields: { sceneIds: "Must be a permutation of the episode's scenes" },
      },
    );
  }
  await guard.user.editor.reorder(episodeId, parsed.data.sceneIds);
  return Response.json({ sceneIds: parsed.data.sceneIds });
}

export async function publishEpisode(
  deps: ApiDeps,
  request: Request,
  episodeId: string,
): Promise<Response> {
  const guard = await requireEditor(deps, request);
  if (!guard.ok) return guard.response;
  const draft = await guard.user.editor.getDraft(episodeId);
  if (!draft) return episodeNotFound(episodeId);
  // Bumping the version lets saved progress detect the change (FR-07).
  const result = validateManifest({
    ...draft,
    manifestVersion: draft.manifestVersion + 1,
  });
  if (!result.ok) {
    return errorResponse(
      422,
      "invalid_manifest",
      "The draft cannot be published until these problems are fixed",
      {
        problems: result.errors,
      },
    );
  }
  await guard.user.editor.publish(result.manifest);
  return Response.json({
    episodeId,
    manifestVersion: result.manifest.manifestVersion,
  });
}
