import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DurationPicker } from "@/components/DurationPicker";

describe("DurationPicker", () => {
  it("is a radio group with 20, 30 and 45 minutes", () => {
    render(<DurationPicker value={30} onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Run length" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30 min" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "20 min" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "45 min" })).not.toBeChecked();
  });

  it("reports the new length when another chip is chosen", () => {
    const onChange = vi.fn();
    render(<DurationPicker value={30} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "45 min" }));
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it("offers other lengths and unchecks the chips for a custom one", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DurationPicker value={30} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Other length" }), {
      target: { value: "25" },
    });
    expect(onChange).toHaveBeenCalledWith(25);
    rerender(<DurationPicker value={25} onChange={onChange} />);
    for (const name of ["20 min", "30 min", "45 min"]) {
      expect(screen.getByRole("radio", { name })).not.toBeChecked();
    }
    expect(screen.getByRole("combobox", { name: "Other length" })).toHaveValue(
      "25",
    );
  });
});
