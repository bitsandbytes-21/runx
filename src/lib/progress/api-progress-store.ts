import { parseSavedProgress, type ProgressStore } from "./progress-record";

interface ApiStoreOptions {
  fetchFn?: typeof fetch;
  /** The current access token; read on every call because tokens refresh. */
  getToken: () => string | Promise<string>;
}

/** Progress for a signed-in runner, stored in the database through the public API. */
export function createApiProgressStore({
  fetchFn = fetch,
  getToken,
}: ApiStoreOptions): ProgressStore {
  const url = (episodeId: string) =>
    `/api/progress/${encodeURIComponent(episodeId)}`;
  const headers = async () => ({ authorization: `Bearer ${await getToken()}` });
  return {
    async load(manifest) {
      const response = await fetchFn(url(manifest.episodeId), {
        headers: await headers(),
      });
      if (response.status === 404) return { kind: "none" };
      if (!response.ok)
        throw new Error(
          `Saved progress could not be loaded (HTTP ${response.status})`,
        );
      return parseSavedProgress(
        await response.json().catch(() => "invalid"),
        manifest,
      );
    },
    async save(record) {
      const response = await fetchFn(url(record.episodeId), {
        method: "PUT",
        headers: { ...(await headers()), "content-type": "application/json" },
        body: JSON.stringify({
          checkpoint: record.checkpoint,
          status: record.status,
          lastDurationMin: record.lastDurationMin,
        }),
      });
      if (!response.ok)
        throw new Error(
          `Progress could not be saved (HTTP ${response.status})`,
        );
    },
    async clear(episodeId) {
      const response = await fetchFn(url(episodeId), {
        method: "DELETE",
        headers: await headers(),
      });
      if (!response.ok)
        throw new Error(
          `Progress could not be cleared (HTTP ${response.status})`,
        );
    },
  };
}
