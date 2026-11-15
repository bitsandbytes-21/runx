import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImportPrompt } from "@/components/ImportPrompt";

describe("ImportPrompt", () => {
  it("asks to import progress saved on this device", () => {
    const onImport = vi.fn();
    const onDecline = vi.fn();
    render(
      <ImportPrompt
        checkpointLabel="Windmills on the horizon"
        onImport={onImport}
        onDecline={onDecline}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Import your progress?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Windmills on the horizon/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onImport).toHaveBeenCalledOnce();
    expect(onDecline).toHaveBeenCalledOnce();
  });
});
