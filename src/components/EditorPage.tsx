"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EditorScreen } from "./EditorScreen";
import { SceneForm } from "./SceneForm";
import { GLASS_BUTTON, GLASS_CARD, LARGE_TITLE, SCREEN } from "./styles";
import type { Manifest, Scene } from "@/lib/manifest/schema";
import type { ManifestError } from "@/lib/manifest/validate-manifest";

const EPISODE_ID = "ep1";
const BASE = `/api/editor/episodes/${EPISODE_ID}`;

type View =
  | { kind: "loading" }
  | { kind: "denied"; message: string }
  | { kind: "list"; manifest: Manifest; problems: ManifestError[] };

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error?.message ?? `Request failed (HTTP ${response.status})`;
}

/** Editor UI; the session cookie authenticates, and the API checks the role. */
export function EditorPage() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [editing, setEditing] = useState<Scene | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let isCurrent = true;
    fetch(`${BASE}/scenes`).then(async (response) => {
      if (!isCurrent) return;
      if (response.status === 401) {
        setView({
          kind: "denied",
          message: "Log in with an editor account to manage scenes.",
        });
      } else if (response.status === 403) {
        setView({
          kind: "denied",
          message:
            "Only editors can manage scenes. Your account is a runner account.",
        });
      } else if (!response.ok) {
        setView({ kind: "denied", message: await errorMessage(response) });
      } else {
        const body = (await response.json()) as {
          manifest: Manifest;
          problems: ManifestError[];
        };
        setView({ kind: "list", ...body });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [revision]);

  if (view.kind === "loading") {
    return (
      <main className={SCREEN}>
        <p role="status">Loading scenes…</p>
      </main>
    );
  }
  if (view.kind === "denied") {
    return (
      <main className={SCREEN}>
        <h1 className={LARGE_TITLE}>Editor</h1>
        <p role="alert" className={GLASS_CARD}>
          {view.message}
        </p>
        <Link href="/" className={GLASS_BUTTON}>
          Back to Home
        </Link>
      </main>
    );
  }

  const { manifest } = view;

  if (editing) {
    return (
      <SceneForm
        key={editing.id}
        scene={editing}
        error={formError}
        onCancel={() => setEditing(null)}
        onSave={async (scene) => {
          const response = await fetch(
            `${BASE}/scenes/${encodeURIComponent(scene.id)}`,
            {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(scene),
            },
          );
          if (!response.ok) {
            setFormError(await errorMessage(response));
            return;
          }
          setFormError(null);
          setEditing(null);
          setStatus(`Saved ${scene.id} to the draft.`);
          reload();
        }}
      />
    );
  }

  return (
    <EditorScreen
      manifest={manifest}
      problems={view.problems}
      status={status}
      onEdit={(sceneId) =>
        setEditing(manifest.scenes.find((s) => s.id === sceneId) ?? null)
      }
      onAdd={() => {
        const next = manifest.scenes.length + 1;
        setEditing({
          id: `scene-${next}`,
          type: "optional",
          order: next,
          title: "",
          part: "rising",
          durationSec: 1,
          required: false,
          prerequisites: [],
          checkpoint: null,
          forCheckpoint: null,
          beat: null,
          source: "Ormsby 1885",
          lines: [],
          bridge: null,
        });
      }}
      onMove={async (sceneId, direction) => {
        const ids = [...manifest.scenes]
          .sort((a, b) => a.order - b.order)
          .map((s) => s.id);
        const from = ids.indexOf(sceneId);
        [ids[from], ids[from + direction]] = [ids[from + direction], ids[from]];
        const response = await fetch(`${BASE}/order`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sceneIds: ids }),
        });
        setStatus(
          response.ok ? `Moved ${sceneId}.` : await errorMessage(response),
        );
        reload();
      }}
      onPublish={async () => {
        const response = await fetch(`${BASE}/publish`, { method: "POST" });
        if (response.ok) {
          const body = (await response.json()) as { manifestVersion: number };
          setStatus(
            `Published version ${body.manifestVersion}. Runners get it on their next run.`,
          );
        } else {
          setStatus(await errorMessage(response));
        }
        reload();
      }}
    />
  );
}
