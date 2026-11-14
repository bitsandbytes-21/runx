import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResumeScreen } from "@/components/ResumeScreen";
import type { ProgressRecord } from "@/lib/progress/progress-record";
import { makeManifest } from "../fixtures/manifest-fixture";

const NOW = Date.UTC(2026, 10, 14, 12);
const record: ProgressRecord = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP2",
  status: "in_progress",
  lastPlayedAt: new Date(NOW - 5 * 86_400_000).toISOString(),
  lastDurationMin: 20,
};

function renderResume(
  overrides: Partial<Parameters<typeof ResumeScreen>[0]> = {},
) {
  const props = {
    manifest: makeManifest(),
    record,
    now: NOW,
    onContinue: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
  render(<ResumeScreen {...props} />);
  return props;
}

describe("ResumeScreen", () => {
  it("shows the saved checkpoint and a two-line recap", () => {
    renderResume();
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Windmills on the horizon/)).toBeInTheDocument();
    expect(screen.getByText("Line 1 of r02.")).toBeInTheDocument();
    expect(screen.getByText("Line 2 of r02.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "20 min" })).toBeChecked();
  });

  it("continues with the recap after a long gap, or skips it", () => {
    const props = renderResume();
    fireEvent.click(screen.getByRole("button", { name: "Continue the story" }));
    expect(props.onContinue).toHaveBeenLastCalledWith({
      durationMin: 20,
      includeRecap: true,
    });
    fireEvent.click(screen.getByRole("switch", { name: "Play the recap" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue the story" }));
    expect(props.onContinue).toHaveBeenLastCalledWith({
      durationMin: 20,
      includeRecap: false,
    });
  });

  it("offers no recap on an immediate continuation", () => {
    const props = renderResume({
      record: { ...record, lastPlayedAt: new Date(NOW - 60_000).toISOString() },
    });
    expect(
      screen.queryByRole("switch", { name: "Play the recap" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue the story" }));
    expect(props.onContinue).toHaveBeenLastCalledWith({
      durationMin: 20,
      includeRecap: false,
    });
  });

  it("says when the remaining story does not fit and offers a longer length", () => {
    const manifest = makeManifest();
    const long = {
      ...manifest,
      scenes: manifest.scenes.map((s) =>
        s.id === "s05" ? { ...s, durationSec: 1500 } : s,
      ),
    };
    const props = renderResume({ manifest: long });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /needs at least 27 min/,
    );
    expect(
      screen.getByRole("button", { name: "Continue the story" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Use 30 min" }));
    expect(screen.getByRole("radio", { name: "30 min" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Continue the story" }));
    expect(props.onContinue).toHaveBeenLastCalledWith({
      durationMin: 30,
      includeRecap: true,
    });
  });

  it("restarts the episode", () => {
    const props = renderResume();
    fireEvent.click(screen.getByRole("button", { name: "Restart episode" }));
    expect(props.onRestart).toHaveBeenCalledOnce();
  });
});
