import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorScreen } from "@/components/EditorScreen";
import { makeManifest } from "../fixtures/manifest-fixture";

function props(overrides: Partial<Parameters<typeof EditorScreen>[0]> = {}) {
  return {
    manifest: makeManifest(),
    problems: [],
    onMove: vi.fn(),
    onEdit: vi.fn(),
    onPublish: vi.fn(),
    ...overrides,
  };
}

describe("EditorScreen", () => {
  it("lists scenes in order with their type", () => {
    render(<EditorScreen {...props()} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("s01")).toBeInTheDocument();
    expect(within(items[0]).getByText("opening")).toBeInTheDocument();
  });

  it("moves a scene up or down", () => {
    const p = props();
    render(<EditorScreen {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Move s02 up" }));
    expect(p.onMove).toHaveBeenCalledWith("s02", -1);
    expect(screen.getByRole("button", { name: "Move s01 up" })).toBeDisabled();
  });

  it("opens a scene for editing", () => {
    const p = props();
    render(<EditorScreen {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit s03" }));
    expect(p.onEdit).toHaveBeenCalledWith("s03");
  });

  it("publishes a valid draft", () => {
    const p = props();
    render(<EditorScreen {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(p.onPublish).toHaveBeenCalledOnce();
  });

  it("disables Publish and explains each problem when the draft is invalid", () => {
    render(
      <EditorScreen
        {...props({
          problems: [
            {
              code: "missing_audio",
              sceneId: "s02",
              message: "Scene s02: a line has no audio file",
            },
          ],
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Scene s02: a line has no audio file",
    );
  });
});
