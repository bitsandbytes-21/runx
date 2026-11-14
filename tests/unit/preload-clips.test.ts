import { describe, expect, it, vi } from "vitest";
import { preloadClips } from "@/lib/audio/preload-clips";

function okResponse(): Response {
  return new Response(new Blob(["x"]), { status: 200 });
}

describe("preloadClips", () => {
  it("loads each distinct clip once and reports progress", async () => {
    const fetchClip = vi.fn(async () => okResponse());
    const progress: [number, number][] = [];
    const urls = await preloadClips(["/a.m4a", "/b.m4a", "/a.m4a"], {
      fetchClip,
      toObjectUrl: (blob) => `blob:${blob.size}`,
      onProgress: (done, total) => progress.push([done, total]),
    });
    expect(fetchClip).toHaveBeenCalledTimes(2);
    expect(urls.get("/a.m4a")).toBe("blob:1");
    expect(progress.at(-1)).toEqual([2, 2]);
    expect(progress[0]).toEqual([0, 2]);
  });

  it("fails naming the clip that could not load", async () => {
    const fetchClip = vi.fn(async (url: string) =>
      url === "/b.m4a" ? new Response(null, { status: 404 }) : okResponse(),
    );
    await expect(
      preloadClips(["/a.m4a", "/b.m4a"], {
        fetchClip,
        toObjectUrl: () => "blob:x",
      }),
    ).rejects.toThrow("/b.m4a");
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      preloadClips(["/a.m4a"], {
        fetchClip: async () => okResponse(),
        toObjectUrl: () => "blob:x",
        signal: controller.signal,
      }),
    ).rejects.toThrow(/cancel/i);
  });
});
