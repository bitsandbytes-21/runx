import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StopSheet } from "@/components/StopSheet";

describe("StopSheet", () => {
  it("lists Save, Finish now and Keep running from safest to boldest", () => {
    render(
      <StopSheet
        canFinishNow
        onSave={vi.fn()}
        onFinish={vi.fn()}
        onKeepRunning={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Retreat for now?" }),
    ).toBeInTheDocument();
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.querySelector("[data-row-title]")?.textContent);
    expect(labels).toEqual([
      "Save for next time",
      "Finish the story now",
      "Keep running",
    ]);
  });

  it("calls the matching handler for each row", () => {
    const onSave = vi.fn();
    const onFinish = vi.fn();
    const onKeepRunning = vi.fn();
    render(
      <StopSheet
        canFinishNow
        onSave={onSave}
        onFinish={onFinish}
        onKeepRunning={onKeepRunning}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save for next time/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Finish the story now/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Keep running/ }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onKeepRunning).toHaveBeenCalledOnce();
  });

  it("offers only Save (and Keep running) before the opening has ended", () => {
    render(
      <StopSheet
        canFinishNow={false}
        onSave={vi.fn()}
        onFinish={vi.fn()}
        onKeepRunning={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Finish the story now/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save for next time/ }),
    ).toBeInTheDocument();
  });

  it("says the current line finishes first and disables rows while it does", () => {
    render(
      <StopSheet
        canFinishNow
        isClosing
        onSave={vi.fn()}
        onFinish={vi.fn()}
        onKeepRunning={vi.fn()}
      />,
    );
    expect(screen.getByText(/finishing the current line/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save for next time/ }),
    ).toBeDisabled();
  });
});
