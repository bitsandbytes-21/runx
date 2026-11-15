import type { ApiDeps } from "./deps";

/** App and database status for uptime checks and deploy smoke tests. */
export async function checkHealth(
  deps: ApiDeps,
  isDatabaseConfigured: boolean,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ status: "ok", database: "not_configured" });
  }
  try {
    await deps.episodes.listPublished();
    return Response.json({ status: "ok", database: "ok" });
  } catch {
    return Response.json(
      { status: "degraded", database: "error" },
      { status: 503 },
    );
  }
}
