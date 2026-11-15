import { readFile } from "node:fs/promises";
import { join } from "node:path";

// docs/api/openapi.yaml is the single source; next.config.ts ships it with this route.
export async function GET() {
  const spec = await readFile(
    join(process.cwd(), "docs", "api", "openapi.yaml"),
    "utf8",
  );
  return new Response(spec, {
    headers: { "content-type": "application/yaml; charset=utf-8" },
  });
}
