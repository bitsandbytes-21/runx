"use client";

import { useState, type FormEvent } from "react";
import { GLASS_BUTTON, GLASS_CARD, PRIMARY_BUTTON, SCREEN } from "./styles";
import {
  CHECKPOINT_IDS,
  SCENE_TYPES,
  SPEAKERS,
  STORY_PARTS,
  type CheckpointId,
  type Line,
  type Scene,
} from "@/lib/manifest/schema";
import { sceneDurationSec } from "@/lib/manifest/scene-duration";

interface SceneFormProps {
  scene: Scene;
  onSave: (scene: Scene) => void;
  onCancel: () => void;
  error?: string | null;
}

const INPUT =
  "min-h-tap w-full rounded-group bg-tint-bg px-3 text-subhead text-label";

export function SceneForm({ scene, onSave, onCancel, error }: SceneFormProps) {
  const [draft, setDraft] = useState<Scene>(scene);
  const [prerequisites, setPrerequisites] = useState(
    scene.prerequisites.join(", "),
  );

  function updateLine(index: number, change: Partial<Line>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, i) =>
        i === index ? { ...line, ...change } : line,
      ),
    }));
  }

  function addLine() {
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          id: `${current.id}-${String(current.lines.length + 1).padStart(2, "0")}`,
          speaker: "sancho",
          text: "",
          audioUrl: "",
          durationSec: 1,
        },
      ],
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...draft,
      prerequisites: prerequisites
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      durationSec: sceneDurationSec(draft.lines),
    });
  }

  return (
    <main className={`${SCREEN} max-w-2xl`}>
      <h1 className="text-title-2 font-bold">Edit {scene.id}</h1>
      <form
        onSubmit={submit}
        className={`${GLASS_CARD} flex flex-col gap-3 text-footnote`}
      >
        <label className="flex flex-col gap-1">
          Title
          <input
            className={INPUT}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            Type
            <select
              className={INPUT}
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as Scene["type"] })
              }
            >
              {SCENE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Story part
            <select
              className={INPUT}
              value={draft.part}
              onChange={(e) =>
                setDraft({ ...draft, part: e.target.value as Scene["part"] })
              }
            >
              {STORY_PARTS.map((part) => (
                <option key={part}>{part}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Checkpoint reached
            <select
              className={INPUT}
              value={draft.checkpoint ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  checkpoint: (e.target.value || null) as CheckpointId | null,
                })
              }
            >
              <option value="">None</option>
              {CHECKPOINT_IDS.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-tap items-center gap-2 self-end">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) =>
                setDraft({ ...draft, required: e.target.checked })
              }
              className="size-5"
            />
            Required
          </label>
        </div>
        <label className="flex flex-col gap-1">
          Prerequisites
          <input
            className={INPUT}
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            placeholder="s01, s04"
          />
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-headline font-semibold">
            Lines (captions)
          </legend>
          {draft.lines.map((line, index) => (
            <div
              key={line.id}
              className="flex flex-col gap-2 rounded-group bg-glass-solid p-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  Speaker
                  <select
                    className={INPUT}
                    value={line.speaker}
                    onChange={(e) =>
                      updateLine(index, {
                        speaker: e.target.value as Line["speaker"],
                      })
                    }
                  >
                    {SPEAKERS.map((speaker) => (
                      <option key={speaker}>{speaker}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 flex flex-col gap-1">
                  {`Line ${index + 1} audio file`}
                  <input
                    className={INPUT}
                    value={line.audioUrl}
                    onChange={(e) =>
                      updateLine(index, { audioUrl: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                {`Line ${index + 1} text`}
                <textarea
                  className={`${INPUT} py-2`}
                  rows={2}
                  value={line.text}
                  onChange={(e) => updateLine(index, { text: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                {`Line ${index + 1} length (seconds)`}
                <input
                  className={INPUT}
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={line.durationSec}
                  onChange={(e) =>
                    updateLine(index, { durationSec: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          ))}
          <button type="button" className={GLASS_BUTTON} onClick={addLine}>
            Add line
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={GLASS_BUTTON} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={PRIMARY_BUTTON}>
            Save scene
          </button>
        </div>
      </form>
    </main>
  );
}
