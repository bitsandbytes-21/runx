import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountRow } from "@/components/AccountRow";

describe("AccountRow", () => {
  it("links guests to login", () => {
    render(<AccountRow auth={{ status: "anonymous" }} onLogOut={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: "Log in or sign up" }),
    ).toHaveAttribute("href", "/login");
  });

  it("logs a signed-in runner out", () => {
    const onLogOut = vi.fn();
    render(
      <AccountRow
        auth={{
          status: "signedIn",
          userId: "u",
          email: "a@b.co",
          accessToken: "t",
        }}
        onLogOut={onLogOut}
      />,
    );
    expect(screen.getByText(/Signed in as a@b.co/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogOut).toHaveBeenCalledOnce();
  });

  it("shows nothing when accounts are not configured", () => {
    const { container } = render(
      <AccountRow auth={{ status: "unconfigured" }} onLogOut={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
