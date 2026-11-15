export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "invalid_manifest"
  | "server_error";

/** One error shape for every endpoint (documented in docs/api/openapi.yaml). */
export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

export const unauthenticated = () =>
  errorResponse(401, "unauthenticated", "Sign in to use this endpoint");
export const forbidden = () =>
  errorResponse(403, "forbidden", "Only editors can do this");
export const episodeNotFound = (id: string) =>
  errorResponse(404, "not_found", `Episode ${id} was not found`);

export async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

export function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "body";
    fields[key] ??= issue.message;
  }
  return fields;
}
