import { describe, expect, it } from "vitest";
import { getPart } from "../index";
import { DEFAULT_OHMS, e24Decade, formatOhms, resistorBands, resistorBandsFor, resistorCacheSize, withResistorValue } from "./passives";

const C = { black: "#1b1b1b", brown: "#7a4a1e", red: "#d32f2f", orange: "#f28c28", yellow: "#f4d03f", green: "#2e8b57", blue: "#2f6fd6", violet: "#7d3cb5", gray: "#8a8f96", white: "#f4f4f4", gold: "#c9a646", silver: "#b8bcc2" };

describe("a resistor's color bands", () => {
  const cases: Array<[number, string[]]> = [
    [0.1, ["brown", "black", "silver", "gold"]],
    [1, ["brown", "black", "gold", "gold"]],
    [4.7, ["yellow", "violet", "gold", "gold"]],
    [10, ["brown", "black", "black", "gold"]],
    [47, ["yellow", "violet", "black", "gold"]],
    [220, ["red", "red", "brown", "gold"]],
    [1000, ["brown", "black", "red", "gold"]],
    [4700, ["yellow", "violet", "red", "gold"]],
    [10_000, ["brown", "black", "orange", "gold"]],
    [1e6, ["brown", "black", "green", "gold"]],
    [10e6, ["brown", "black", "blue", "gold"]],
  ];
  for (const [ohms, names] of cases) {
    it(`${formatOhms(ohms)}: ${names.join(", ")}`, () => {
      expect(resistorBands(ohms)).toEqual(names.map((n) => C[n as keyof typeof C]));
      expect(resistorBandsFor(ohms)).toMatchObject({ shownOhms: ohms, exact: true });
    });
  }

  it("shows a value off the E24 series as the nearest one, and says so", () => {
    // 1234 Ω used to come out as 1.2 kΩ without a word; now the bands say 1.2 kΩ and `exact` is false.
    expect(resistorBandsFor(1234)).toEqual({ colors: [C.brown, C.red, C.red, C.gold], shownOhms: 1200, exact: false });
    expect(resistorBandsFor(250).shownOhms).toBe(240);
  });

  it("puts the tolerance in the fourth band: gold for ±5 %, brown for ±1 %", () => {
    expect(resistorBands(220, 5)[3]).toBe(C.gold);
    expect(resistorBands(220, 1)[3]).toBe(C.brown);
  });

  it("offers a decade of E24 values as chips", () => {
    expect(e24Decade(3)).toHaveLength(24);
    expect(e24Decade(3)).toContain(4700);
    expect(e24Decade(-1)[0]).toBe(0.1);
  });
});

describe("the recolored resistor", () => {
  const model = getPart("resistor")!;
  it("names the value and recolors the bands", () => {
    const r = withResistorValue(model, 4700);
    expect(r.name).toBe("Resistor (4.7 kΩ)");
    const bands = r.solids.filter((s) => "id" in s && typeof s.id === "string" && s.id.startsWith("band-"));
    expect(bands.map((s) => ("fill" in s ? s.fill : null))).toEqual([C.yellow, C.violet, C.red, C.gold]);
    expect(withResistorValue(model, 4700)).toBe(r);
    expect(withResistorValue(model, DEFAULT_OHMS).name).toBe("Resistor (220 Ω)");
  });

  it("keeps at most 64 recolored resistors, however many values are typed", () => {
    for (let ohms = 100; ohms < 400; ohms++) withResistorValue(model, ohms);
    expect(resistorCacheSize()).toBe(64);
  });
});
