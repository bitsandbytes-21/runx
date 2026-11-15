import { validateManifest } from "@/lib/manifest/validate-manifest";
import type { Manifest } from "@/lib/manifest/schema";
import ep1 from "./ep1.manifest.json";

// Bundled content is validated at load time like any other external data, so a
// broken edit to the JSON fails loudly instead of reaching a runner.
function loadBundled(input: unknown): Manifest {
  const result = validateManifest(input);
  if (!result.ok) {
    const detail = result.errors.map((error) => error.message).join("; ");
    throw new Error(`Bundled manifest is invalid: ${detail}`);
  }
  return result.manifest;
}

export const EP1_MANIFEST: Manifest = loadBundled(ep1);

export const BUNDLED_EPISODES: readonly Manifest[] = [EP1_MANIFEST];
