import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoEndPrompt } from "@/components/DemoEndPrompt";

describe("DemoEndPrompt", () => {
  it("offers sign-up to keep progress when accounts exist", () => {
    render(<DemoEndPrompt canSignUp />);
    expect(
      screen.getByRole("link", { name: "Sign up to keep your place" }),
    ).toHaveAttribute("href", "/login");
  });

  it("points to a real run when accounts are not set up", () => {
    render(<DemoEndPrompt canSignUp={false} />);
    expect(
      screen.queryByRole("link", { name: /Sign up/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/demo progress stays separate/i),
    ).toBeInTheDocument();
  });
});
