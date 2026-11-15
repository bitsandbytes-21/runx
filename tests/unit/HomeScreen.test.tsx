import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/components/HomeScreen";

const NOW = Date.UTC(2026, 10, 14, 19, 12);

describe("HomeScreen", () => {
  it("shows the episode with 30 minutes chosen", () => {
    render(<HomeScreen now={null} onStart={() => {}} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "RunX" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Giants on the Horizon" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30 min" })).toBeChecked();
  });

  it("starts a run with the chosen length when Ride out is tapped", () => {
    const onStart = vi.fn();
    render(<HomeScreen now={null} onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Ride out" }));
    expect(onStart).toHaveBeenLastCalledWith(30);
    fireEvent.click(screen.getByRole("radio", { name: "45 min" }));
    fireEvent.click(screen.getByRole("button", { name: "Ride out" }));
    expect(onStart).toHaveBeenLastCalledWith(45);
  });

  it("shows when the story ends once the time is known", () => {
    render(<HomeScreen now={NOW} timeZone="UTC" onStart={() => {}} />);
    expect(screen.getByText(/Story ends at 7:42/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "20 min" }));
    expect(screen.getByText(/Story ends at 7:32/)).toBeInTheDocument();
  });

  it("starts with the last used length when one is given", () => {
    render(
      <HomeScreen now={null} initialDurationMin={45} onStart={() => {}} />,
    );
    expect(screen.getByRole("radio", { name: "45 min" })).toBeChecked();
  });

  it("links to the guest demo", () => {
    render(<HomeScreen now={null} onStart={() => {}} />);
    expect(screen.getByRole("link", { name: /Try the demo/ })).toHaveAttribute(
      "href",
      "/run?demo=1",
    );
  });
});
