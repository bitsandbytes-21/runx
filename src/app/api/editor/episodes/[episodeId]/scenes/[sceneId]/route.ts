import { createApiDeps } from "@/lib/api/create-deps";
import { saveScene } from "@/lib/api/editor-handlers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ episodeId: string; sceneId: string }> },
) {
  const { episodeId, sceneId } = await params;
  return saveScene(createApiDeps(), request, episodeId, sceneId);
}
