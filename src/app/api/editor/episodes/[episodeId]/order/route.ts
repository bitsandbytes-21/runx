import { createApiDeps } from "@/lib/api/create-deps";
import { putSceneOrder } from "@/lib/api/editor-handlers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  return putSceneOrder(createApiDeps(), request, (await params).episodeId);
}
