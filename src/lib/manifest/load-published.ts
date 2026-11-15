import type { Manifest } from "./schema";
import { validateManifest } from "./validate-manifest";

/**
 * Loads the published manifest from the API so editor changes reach runners;
 * falls back to the bundled copy when offline or when the response is invalid.
 */
export async function loadPublishedManifest(
  episodeId: string,
  fallback: Manifest,
  fetchFn: typeof fetch = fetch,
): Promise<Manifest> {
  try {
    const response = await fetchFn(
      `/api/episodes/${encodeURIComponent(episodeId)}`,
    );
    if (!response.ok) return fallback;
    const result = validateManifest(await response.json());
    return result.ok ? result.manifest : fallback;
  } catch {
    return fallback;
  }
}
