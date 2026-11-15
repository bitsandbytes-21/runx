import { connection } from "next/server";
import { createApiDeps } from "@/lib/api/create-deps";
import { listEpisodes } from "@/lib/api/handlers";

export async function GET() {
  // Episodes change when an editor publishes, so never prerender this at build time.
  await connection();
  return listEpisodes(createApiDeps());
}
