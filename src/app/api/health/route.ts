import { connection } from "next/server";
import { createApiDeps } from "@/lib/api/create-deps";
import { checkHealth } from "@/lib/api/health";
import { getSupabaseConfig } from "@/lib/env";

export async function GET() {
  await connection();
  return checkHealth(createApiDeps(), getSupabaseConfig() !== null);
}
