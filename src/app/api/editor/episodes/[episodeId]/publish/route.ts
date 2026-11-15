import { createApiDeps } from "@/lib/api/create-deps";
import { publishEpisode } from "@/lib/api/editor-handlers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  return publishEpisode(createApiDeps(), request, (await params).episodeId);
}
