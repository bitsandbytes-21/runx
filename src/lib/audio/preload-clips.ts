export interface PreloadOptions {
  fetchClip?: (url: string, signal?: AbortSignal) => Promise<Response>;
  toObjectUrl?: (blob: Blob) => string;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  concurrency?: number;
}

/**
 * Downloads every clip before the run starts so playback never needs the
 * network (US-1). Resolves to a map from clip URL to a local object URL.
 */
export async function preloadClips(
  urls: readonly string[],
  {
    fetchClip = (url, signal) => fetch(url, { signal }),
    toObjectUrl = (blob) => URL.createObjectURL(blob),
    onProgress,
    signal,
    concurrency = 6,
  }: PreloadOptions = {},
): Promise<Map<string, string>> {
  const unique = [...new Set(urls)];
  const loaded = new Map<string, string>();
  let next = 0;
  onProgress?.(0, unique.length);

  async function worker() {
    while (next < unique.length) {
      if (signal?.aborted) throw new Error("Loading was cancelled");
      const url = unique[next++];
      const response = await fetchClip(url, signal);
      if (!response.ok)
        throw new Error(`Could not load ${url} (HTTP ${response.status})`);
      loaded.set(url, toObjectUrl(await response.blob()));
      onProgress?.(loaded.size, unique.length);
    }
  }

  if (signal?.aborted) throw new Error("Loading was cancelled");
  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, worker),
  );
  return loaded;
}
