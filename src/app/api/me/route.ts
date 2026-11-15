import { createApiDeps } from "@/lib/api/create-deps";
import { getMe } from "@/lib/api/handlers";

export async function GET(request: Request) {
  return getMe(createApiDeps(), request);
}
