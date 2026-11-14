import type { Manifest } from "@/lib/manifest/schema";
import type { Timeline } from "@/lib/scheduler/build-timeline";

/** Every clip a run may need: its timeline plus the sign-off and compressed endings. */
export function sessionClipUrls(
  manifest: Manifest,
  timeline: Extract<Timeline, { ok: true }>,
): string[] {
  const byId = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const urls = timeline.entries.flatMap((entry) => {
    const scene = byId.get(entry.sceneId)!;
    const lines =
      entry.includeBridge && scene.bridge
        ? [...scene.lines, scene.bridge]
        : scene.lines;
    return lines.map((line) => line.audioUrl);
  });
  for (const scene of manifest.scenes) {
    if (scene.type === "signoff" || scene.type === "compressed_ending") {
      urls.push(...scene.lines.map((line) => line.audioUrl));
    }
  }
  return [...new Set(urls)];
}
