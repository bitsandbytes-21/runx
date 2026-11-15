import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContinueCard } from "@/components/ContinueCard";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();
const record = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP1" as const,
  status: "in_progress" as const,
  lastPlayedAt: "2026-11-14T10:00:00.000Z",
  lastDurationMin: 30,
};

describe("ContinueCard", () => {
  it("shows the checkpoint with a recap line and links to Resume", () => {
    render(
      <ContinueCard
        manifest={manifest}
        load={{ kind: "ok", record }}
        onRestart={vi.fn()}
      />,
    );
    expect(screen.getByText(/After the departure/)).toBeInTheDocument();
    expect(screen.getByText("Line 2 of r01.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue the story" }),
    ).toHaveAttribute("href", "/resume");
  });

  it("offers Restart when saved progress could not be read", () => {
    const onRestart = vi.fn();
    render(
      <ContinueCard
        manifest={manifest}
        load={{ kind: "unreadable", reason: "corrupted" }}
        onRestart={onRestart}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved progress could not be read",
    );
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("shows nothing without saved progress, and a note after completing", () => {
    const { container, rerender } = render(
      <ContinueCard
        manifest={manifest}
        load={{ kind: "none" }}
        onRestart={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <ContinueCard
        manifest={manifest}
        load={{
          kind: "ok",
          record: { ...record, status: "complete", checkpoint: null },
        }}
        onRestart={vi.fn()}
      />,
    );
    expect(screen.getByText(/You finished this episode/)).toBeInTheDocument();
  });
});
