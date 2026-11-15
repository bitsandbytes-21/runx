import { GLASS_CARD, LARGE_TITLE, PRIMARY_BUTTON, SCREEN } from "./styles";
import type { Manifest } from "@/lib/manifest/schema";
import type { ManifestError } from "@/lib/manifest/validate-manifest";

interface EditorScreenProps {
  manifest: Manifest;
  problems: ManifestError[];
  onMove: (sceneId: string, direction: -1 | 1) => void;
  onEdit: (sceneId: string) => void;
  onPublish: () => void;
  onAdd?: () => void;
  status?: string | null;
}

const SMALL_BUTTON =
  "min-h-tap min-w-tap rounded-pill bg-tint-bg px-3 text-footnote font-semibold text-tint-fg disabled:opacity-40";

export function EditorScreen({
  manifest,
  problems,
  onMove,
  onEdit,
  onPublish,
  onAdd,
  status,
}: EditorScreenProps) {
  const scenes = [...manifest.scenes].sort((a, b) => a.order - b.order);
  const canPublish = problems.length === 0;
  return (
    <main className={`${SCREEN} max-w-2xl`}>
      <h1 className={LARGE_TITLE}>Editor</h1>
      <p className="text-footnote text-fg-2">
        {manifest.title} · published version {manifest.manifestVersion}. Changes
        stay in the draft until you publish.
      </p>

      <section className={`${GLASS_CARD} flex flex-col gap-3`}>
        {canPublish ? (
          <p className="text-footnote text-fg-2">
            The draft passes validation.
          </p>
        ) : (
          <div role="alert" className="flex flex-col gap-1 text-footnote">
            <p className="font-semibold">
              Publish is blocked until these are fixed:
            </p>
            <ul className="list-disc pl-5">
              {problems.map((problem, index) => (
                <li key={`${problem.code}-${index}`}>{problem.message}</li>
              ))}
            </ul>
          </div>
        )}
        {status && (
          <p role="status" className="text-footnote">
            {status}
          </p>
        )}
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!canPublish}
          onClick={onPublish}
        >
          Publish
        </button>
      </section>

      <ol className="flex flex-col gap-2">
        {scenes.map((scene, index) => (
          <li
            key={scene.id}
            className="glass flex items-center gap-3 rounded-group p-3"
          >
            <span className="tabular w-6 text-footnote text-fg-2">
              {index + 1}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-headline font-semibold">
                {scene.title || scene.id}
              </span>
              <span className="flex flex-wrap gap-2 text-footnote text-fg-2">
                {scene.title && scene.title !== scene.id && (
                  <span>{scene.id}</span>
                )}
                <span className="rounded-pill bg-glass-solid px-2">
                  {scene.type}
                </span>
                {scene.checkpoint && <span>{scene.checkpoint}</span>}
              </span>
            </span>
            <button
              type="button"
              className={SMALL_BUTTON}
              aria-label={`Move ${scene.id} up`}
              disabled={index === 0}
              onClick={() => onMove(scene.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={SMALL_BUTTON}
              aria-label={`Move ${scene.id} down`}
              disabled={index === scenes.length - 1}
              onClick={() => onMove(scene.id, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={SMALL_BUTTON}
              aria-label={`Edit ${scene.id}`}
              onClick={() => onEdit(scene.id)}
            >
              Edit
            </button>
          </li>
        ))}
      </ol>
      {onAdd && (
        <button
          type="button"
          className="glass min-h-btn rounded-pill text-subhead font-semibold"
          onClick={onAdd}
        >
          Add scene
        </button>
      )}
    </main>
  );
}
