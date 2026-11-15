import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceneForm } from "@/components/SceneForm";
import { makeManifest } from "../fixtures/manifest-fixture";

const scene = makeManifest().scenes[2];

describe("SceneForm", () => {
  it("saves edited fields and recomputes the duration from the lines", () => {
    const onSave = vi.fn();
    render(<SceneForm scene={scene} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Giants sighted" },
    });
    fireEvent.change(screen.getByLabelText("Prerequisites"), {
      target: { value: "s01, s02" },
    });
    fireEvent.change(screen.getByLabelText("Line 1 text"), {
      target: { value: "Behold!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save scene" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({
      id: "s03",
      title: "Giants sighted",
      prerequisites: ["s01", "s02"],
    });
    expect(saved.lines[0].text).toBe("Behold!");
    expect(saved.durationSec).toBe(61);
  });

  it("adds a line", () => {
    const onSave = vi.fn();
    render(<SceneForm scene={scene} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(screen.getByLabelText("Line 3 text")).toBeInTheDocument();
  });

  it("cancels without saving", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<SceneForm scene={scene} onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
