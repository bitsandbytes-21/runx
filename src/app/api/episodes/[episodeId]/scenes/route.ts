import { connection } from "next/server";
import { createApiDeps } from "@/lib/api/create-deps";
import { getEpisodeScenes } from "@/lib/api/handlers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  await connection();
  return getEpisodeScenes(createApiDeps(), request, (await params).episodeId);
}
