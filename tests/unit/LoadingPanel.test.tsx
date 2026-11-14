import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadingPanel } from "@/components/LoadingPanel";

describe("LoadingPanel", () => {
  it("shows clip progress and cancels", () => {
    const onCancel = vi.fn();
    render(<LoadingPanel done={9} total={17} onCancel={onCancel} />);
    const bar = screen.getByRole("progressbar", { name: "Loading the story" });
    expect(bar).toHaveAttribute("aria-valuenow", "9");
    expect(bar).toHaveAttribute("aria-valuemax", "17");
    expect(screen.getByText("9 of 17 clips")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("names what failed and offers Retry", () => {
    const onRetry = vi.fn();
    render(
      <LoadingPanel
        done={3}
        total={17}
        error="Could not load /a.m4a"
        onRetry={onRetry}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load /a.m4a",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
