"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoadingPanel } from "./LoadingPanel";
import { RunScreen } from "./RunScreen";
import { useRunSession, type Clock } from "./hooks/use-run-session";
import {
  createHtmlAudioPort,
  createSilentAudioPort,
  type AudioPort,
} from "@/lib/audio/audio-port";
import { preloadClips } from "@/lib/audio/preload-clips";
import { EP1_MANIFEST } from "@/content/episodes";
import type { Manifest } from "@/lib/manifest/schema";
import { buildTimeline, type Timeline } from "@/lib/scheduler/build-timeline";
import { parseRunOptions, type RunOptions } from "@/lib/run/run-options";
import { sessionClipUrls } from "@/lib/run/session-clips";

type FittedTimeline = Extract<Timeline, { ok: true }>;

type LoadState =
  | { status: "loading"; done: number; total: number; error: string | null }
  | { status: "ready"; urls: Map<string, string> };

const PERFORMANCE_CLOCK: Clock = { now: () => performance.now() };

export function RunPage() {
  const params = useSearchParams();
  const options = useMemo(() => parseRunOptions(params), [params]);
  const manifest = EP1_MANIFEST;
  const timeline = useMemo(
    () => buildTimeline(manifest, options.durationMin, null),
    [manifest, options],
  );
  if (!timeline.ok) return null;
  return (
    <LoadedRun manifest={manifest} timeline={timeline} options={options} />
  );
}

function LoadedRun({
  manifest,
  timeline,
  options,
}: {
  manifest: Manifest;
  timeline: FittedTimeline;
  options: RunOptions;
}) {
  const router = useRouter();
  const clips = useMemo(
    () => sessionClipUrls(manifest, timeline),
    [manifest, timeline],
  );
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<LoadState>(() =>
    options.audioMode === "silent"
      ? { status: "ready", urls: new Map() }
      : { status: "loading", done: 0, total: clips.length, error: null },
  );
  const needsLoading = options.audioMode !== "silent";

  useEffect(() => {
    if (!needsLoading) return;
    const controller = new AbortController();
    preloadClips(clips, {
      signal: controller.signal,
      onProgress: (done, total) =>
        setLoad({ status: "loading", done, total, error: null }),
    })
      .then((urls) => setLoad({ status: "ready", urls }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad((current) => ({
          status: "loading",
          done: current.status === "loading" ? current.done : 0,
          total: clips.length,
          error:
            error instanceof Error ? error.message : "The story could not load",
        }));
      });
    return () => controller.abort();
  }, [clips, needsLoading, attempt]);

  if (load.status === "loading") {
    return (
      <LoadingPanel
        done={load.done}
        total={load.total}
        error={load.error}
        onRetry={() => setAttempt((n) => n + 1)}
        onCancel={() => router.push("/")}
      />
    );
  }
  return (
    <ActiveRun
      manifest={manifest}
      timeline={timeline}
      options={options}
      urls={load.urls}
    />
  );
}

function ActiveRun({
  manifest,
  timeline,
  options,
  urls,
}: {
  manifest: Manifest;
  timeline: FittedTimeline;
  options: RunOptions;
  urls: Map<string, string>;
}) {
  const router = useRouter();
  const [audio] = useState<AudioPort>(() =>
    options.audioMode === "silent"
      ? createSilentAudioPort()
      : createHtmlAudioPort((url) => urls.get(url) ?? url),
  );
  const { state, dispatch } = useRunSession({
    manifest,
    timeline,
    audio,
    clock: PERFORMANCE_CLOCK,
    speed: options.speed,
    autoStart: true,
  });
  return (
    <RunScreen
      state={state}
      isDemo={options.isDemo}
      onPause={() => dispatch({ type: "PAUSE" })}
      onResume={() => dispatch({ type: "RESUME" })}
      onStop={() => dispatch({ type: "STOP" })}
      onKeepRunning={() => dispatch({ type: "KEEP_RUNNING" })}
      onSave={() => dispatch({ type: "CHOOSE_SAVE" })}
      onFinish={() => dispatch({ type: "CHOOSE_FINISH" })}
      onRetry={() => dispatch({ type: "RETRY" })}
      onSkipLine={() => dispatch({ type: "SKIP_LINE" })}
      onDone={() => router.push("/")}
    />
  );
}
