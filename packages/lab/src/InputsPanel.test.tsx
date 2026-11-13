import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findControl, type NumberControl } from "@kiungo/core/lab/controls";
import { resistorBands } from "@kiungo/core/parts/models/passives";
import { NumberField } from "./InputsPanel";

const resistor = findControl("resistor", "ohms") as NumberControl;

function field(control: NumberControl, value?: number) {
  const onChange = vi.fn();
  const view = render(<NumberField control={control} value={value} dimmed={false} onChange={onChange} />);
  const input = screen.getByTestId(`input-${control.key}`) as HTMLInputElement;
  const type = (text: string) => {
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: "Enter" });
  };
  return { onChange, input, type, view };
}

describe("a resistor's value, typed (B8.5)", () => {
  it("takes 4.7k, 4k7, 330 and 1M, in ohms", () => {
    const { onChange, type } = field(resistor);
    for (const text of ["4.7k", "4k7", "330", "1M", "4.7 kΩ", "10M", "0.1"]) type(text);
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([4700, 4700, 330, 1e6, 4700, 10e6, 0.1]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the value with its prefix and the bands follow it", () => {
    field(resistor, 4700);
    expect(screen.getByTestId("input-ohms")).toHaveValue("4.7 kΩ");
    // The bands each value draws: 4.7 kΩ yellow violet red, 330 Ω orange orange brown, 1 MΩ brown black green.
    expect(resistorBands(4700).slice(0, 3)).toEqual(["#f4d03f", "#7d3cb5", "#d32f2f"]);
    expect(resistorBands(330).slice(0, 3)).toEqual(["#f28c28", "#f28c28", "#7a4a1e"]);
    expect(resistorBands(1e6).slice(0, 3)).toEqual(["#7a4a1e", "#1b1b1b", "#2e8b57"]);
  });

  it("refuses a bad entry with a message under the field, and keeps the value", () => {
    const { onChange, type, input } = field(resistor, 220);
    type("banana");
    expect(screen.getByRole("alert")).toHaveTextContent("isn't a number");
    expect(input).toHaveAttribute("aria-invalid", "true");
    type("20M");
    expect(screen.getByRole("alert")).toHaveTextContent("20 MΩ is outside 0.1 Ω to 10 MΩ.");
    type("10m");
    expect(screen.getByRole("alert")).toHaveTextContent("For megaohms type M");
    expect(onChange).not.toHaveBeenCalled();
    // Esc puts back what was there.
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("220 Ω");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says when the bands show the nearest standard value instead of the one set", () => {
    field(resistor, 1234);
    expect(screen.getByTestId("resistor-shown-as")).toHaveTextContent("Bands show 1.2 kΩ, the nearest standard (E24) value; the circuit uses 1.23 kΩ.");
  });

  it("offers the usual values first, then the E24 values of the decade, and a reset", () => {
    const { onChange } = field(resistor, 4700);
    const chips = screen.getByRole("group", { name: "Common resistance values" });
    const labels = Array.from(chips.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels.slice(0, 3)).toEqual(["220 Ω", "1 kΩ", "10 kΩ"]);
    expect(labels).toContain("4.7 kΩ");
    expect(labels).toContain("9.1 kΩ");
    fireEvent.click(screen.getByRole("button", { name: "10 kΩ" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset Resistance to 220 Ω" }));
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([10_000, 220]);
    expect(screen.getByText(/0\.1 Ω to 10 MΩ/)).toBeInTheDocument();
  });
});

describe("other quantities in their units", () => {
  it("an obstacle distance is typed in mm or m and stored in meters", () => {
    const { onChange, type, input } = field(findControl("hc-sr04", "distance") as NumberControl, 0.3);
    expect(input).toHaveValue("300 mm");
    type("120 mm");
    type("1.5");
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([0.12, 1.5]);
  });

  it("light on an LDR is in lux, with a log slider", () => {
    const { input } = field(findControl("ldr", "illuminance") as NumberControl, 1000);
    expect(input).toHaveValue("1 klx");
    expect(screen.getByRole("slider", { name: "Light on it slider" })).toHaveAttribute("aria-valuetext", "1 klx");
  });
});
