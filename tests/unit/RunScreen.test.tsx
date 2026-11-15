import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunScreen, type RunScreenHandlers } from "@/components/RunScreen";
import {
  afterOpening,
  applyEvents,
  startedSession,
} from "../fixtures/session-fixture";

function handlers(): RunScreenHandlers {
  return {
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    onKeepRunning: vi.fn(),
    onSave: vi.fn(),
    onFinish: vi.fn(),
    onRetry: vi.fn(),
    onSkipLine: vi.fn(),
    onDone: vi.fn(),
  };
}

describe("RunScreen", () => {
  it("shows the remaining time, the caption with its speaker and the story part", () => {
    render(
      <RunScreen
        state={applyEvents(startedSession(20), { type: "TICK", deltaSec: 65 })}
        {...handlers()}
      />,
    );
    expect(screen.getByRole("timer")).toHaveTextContent("18:55");
    expect(screen.getByText("until glory")).toBeInTheDocument();
    const caption = screen.getByRole("status", { name: "Caption" });
    expect(caption).toHaveAttribute("aria-live", "polite");
    expect(within(caption).getByText("Sancho")).toBeInTheDocument();
    expect(within(caption).getByText("Line 1 of s01.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Story part 1 of 4, Warm-up" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Scene 1 of/)).toBeInTheDocument();
  });

  it("calls Pause, and shows Paused with Resume when paused", () => {
    const h = handlers();
    const { rerender } = render(<RunScreen state={startedSession()} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(h.onPause).toHaveBeenCalledOnce();
    rerender(
      <RunScreen
        state={applyEvents(startedSession(), { type: "PAUSE" })}
        {...h}
      />,
    );
    expect(screen.getByText("Paused")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(h.onResume).toHaveBeenCalledOnce();
  });

  it("calls Stop", () => {
    const h = handlers();
    render(<RunScreen state={startedSession()} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(h.onStop).toHaveBeenCalledOnce();
  });

  it("names a failed line in an alert with Retry and Skip this line", () => {
    const h = handlers();
    const failed = applyEvents(startedSession(), {
      type: "AUDIO_ERROR",
      lineId: "s01-01",
      message: "load failed",
    });
    render(<RunScreen state={failed} {...h} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/could not play/i);
    expect(alert).toHaveTextContent(/clock is stopped/i);
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    fireEvent.click(
      within(alert).getByRole("button", { name: "Skip this line" }),
    );
    expect(h.onRetry).toHaveBeenCalledOnce();
    expect(h.onSkipLine).toHaveBeenCalledOnce();
  });

  it("shows a demo banner in demo mode", () => {
    render(<RunScreen state={startedSession()} isDemo {...handlers()} />);
    expect(screen.getByText(/Demo/)).toBeInTheDocument();
  });

  it("shows the summary with Done when the run has ended", () => {
    const h = handlers();
    const saved = applyEvents(
      afterOpening(),
      { type: "STOP" },
      { type: "CHOOSE_SAVE" },
    );
    let ended = saved;
    while (ended.phase !== "ended") {
      ended = applyEvents(ended, {
        type: "LINE_ENDED",
        lineId: ended.special!.lines[ended.specialLineIndex].id,
      });
    }
    render(<RunScreen state={ended} {...h} />);
    expect(
      screen.getByRole("heading", { name: "You were there" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Saved at: After the departure/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(h.onDone).toHaveBeenCalledOnce();
  });
});
