import { createApiDeps } from "@/lib/api/create-deps";
import { getDraftScenes } from "@/lib/api/editor-handlers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  return getDraftScenes(createApiDeps(), request, (await params).episodeId);
}
