import { connection } from "next/server";
import { createApiDeps } from "@/lib/api/create-deps";
import { getEpisode } from "@/lib/api/handlers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  await connection();
  return getEpisode(createApiDeps(), request, (await params).episodeId);
}
