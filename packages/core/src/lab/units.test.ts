import { describe, expect, it } from "vitest";
import { E24, formatQuantity, formatRange, fromShown, isE24, nearestE24, parseQuantity, toShown } from "./units";

const value = (text: string, q: Parameters<typeof parseQuantity>[1]) => {
  const r = parseQuantity(text, q);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe("writing a quantity", () => {
  it("uses the SI prefix that keeps the number readable", () => {
    expect(formatQuantity(220, "resistance")).toBe("220 Ω");
    expect(formatQuantity(4700, "resistance")).toBe("4.7 kΩ");
    expect(formatQuantity(1e6, "resistance")).toBe("1 MΩ");
    expect(formatQuantity(4.7, "resistance")).toBe("4.7 Ω");
    expect(formatQuantity(0.1, "resistance")).toBe("0.1 Ω");
    expect(formatQuantity(0.3, "length")).toBe("300 mm");
    expect(formatQuantity(2, "length")).toBe("2 m");
    expect(formatQuantity(0.5, "time")).toBe("500 ms");
    expect(formatQuantity(1.2, "time")).toBe("1.2 s");
    expect(formatQuantity(1500, "illuminance")).toBe("1.5 klx");
    expect(formatQuantity(0.38, "current")).toBe("380 mA");
  });

  it("shows the units SI accepts where agreed: °, °C, %, ppm, and pressure in hPa", () => {
    expect(formatQuantity(Math.PI / 4, "angle")).toBe("45°");
    expect(formatQuantity(24.5, "temperature")).toBe("24.5 °C");
    expect(formatQuantity(0.55, "ratio")).toBe("55 %");
    expect(formatQuantity(3e-4, "amount")).toBe("300 ppm");
    expect(formatQuantity(101_320, "pressure")).toBe("1013.2 hPa");
    expect(formatRange(0.1, 10e6, "resistance")).toBe("0.1 Ω to 10 MΩ");
  });

  it("converts between the stored SI value and the shown unit", () => {
    expect(toShown(Math.PI, "angle")).toBeCloseTo(180, 12);
    expect(fromShown(50, "ratio")).toBe(0.5);
    expect(toShown(1000, "resistance")).toBe(1000);
  });
});

describe("reading what a person typed", () => {
  it("takes a resistance with or without a prefix, the prefix as a decimal point, and R for ohms", () => {
    expect(value("4.7k", "resistance")).toBeCloseTo(4700, 9);
    expect(value("4k7", "resistance")).toBeCloseTo(4700, 9);
    expect(value("4700", "resistance")).toBe(4700);
    expect(value("4.7 kΩ", "resistance")).toBeCloseTo(4700, 9);
    expect(value("330", "resistance")).toBe(330);
    expect(value("1M", "resistance")).toBe(1e6);
    expect(value("10M", "resistance")).toBe(10e6);
    expect(value("2M2", "resistance")).toBeCloseTo(2.2e6, 6);
    expect(value("1meg", "resistance")).toBe(1e6);
    expect(value("4R7", "resistance")).toBeCloseTo(4.7, 12);
    expect(value("47R", "resistance")).toBe(47);
    expect(value("10 ohms", "resistance")).toBe(10);
  });

  it("refuses what isn't a value, with a reason", () => {
    expect(parseQuantity("", "resistance")).toEqual({ ok: false, error: "Enter a value." });
    expect(parseQuantity("abc", "resistance").ok).toBe(false);
    expect(parseQuantity("4.7x", "resistance").ok).toBe(false);
    // m is milli: for a resistor it's almost always a mistyped M, so it's refused with a hint.
    expect(parseQuantity("10m", "resistance")).toEqual({ ok: false, error: "m is milli. For megaohms type M (10M) or meg." });
    expect(parseQuantity("5k", "angle")).toEqual({ ok: false, error: "° takes no prefix." });
  });

  it("reads a bare number in the unit shown, and a prefixed one in SI", () => {
    expect(value("300 mm", "length")).toBeCloseTo(0.3, 12);
    expect(value("0.3", "length")).toBe(0.3);
    expect(value("2m", "length")).toBe(2);
    expect(value("45", "angle")).toBeCloseTo(Math.PI / 4, 12);
    expect(value("45°", "angle")).toBeCloseTo(Math.PI / 4, 12);
    expect(value("1.5rad", "angle")).toBe(1.5);
    expect(value("55", "ratio")).toBeCloseTo(0.55, 12);
    expect(value("55 %", "ratio")).toBeCloseTo(0.55, 12);
    expect(value("300", "amount")).toBeCloseTo(3e-4, 12);
    expect(value("500ms", "time")).toBeCloseTo(0.5, 12);
    expect(value("1013.2", "pressure")).toBeCloseTo(101_320, 6);
    expect(value("101.3kPa", "pressure")).toBeCloseTo(101_300, 6);
    expect(value("298.15 K", "temperature")).toBeCloseTo(25, 9);
    expect(value("25 °C", "temperature")).toBe(25);
  });
});

describe("the E24 series", () => {
  it("has 24 values a decade and finds the nearest on a log scale", () => {
    expect(E24).toHaveLength(24);
    expect(nearestE24(4700)).toBe(4700);
    expect(nearestE24(1234)).toBe(1200);
    expect(nearestE24(4.6)).toBe(4.7);
    expect(nearestE24(9.3)).toBe(9.1);
    expect(nearestE24(9.6)).toBe(10);
    expect(nearestE24(9.8)).toBe(10);
    expect(isE24(220)).toBe(true);
    expect(isE24(250)).toBe(false);
  });
});
