import { describe, expect, it } from "vitest";
import { PARTS } from "../parts";
import { allControls, coerceInput, findControl, ldrOhms, lightPercentFromLux, luxFromLightPercent, migrateNodeInputs, readoutsFor, type NumberControl } from "./controls";
import { QUANTITIES } from "./units";

const numbers = (partId: string) => allControls(partId).filter((c): c is NumberControl => c.kind === "number");

describe("every attribute in the lab is a physical quantity (B8.6)", () => {
  it("each number a part can be set to has a quantity and an SI unit, its default inside its range", () => {
    let count = 0;
    for (const part of PARTS) {
      for (const c of numbers(part.id)) {
        count++;
        expect(QUANTITIES[c.quantity], `${part.id}.${c.key}`).toBeDefined();
        expect(c.unit, `${part.id}.${c.key}`).toBe(QUANTITIES[c.quantity].si);
        expect(c.min <= c.default && c.default <= c.max, `${part.id}.${c.key} default ${c.default} outside ${c.min}–${c.max}`).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(40);
  });

  it("no attribute is a unitless 0–100 scale: a share is a ratio stored 0–1 and shown as %", () => {
    for (const part of PARTS) {
      for (const c of numbers(part.id)) {
        const unitless0to100 = c.quantity === "count" && c.min === 0 && c.max === 100;
        expect(unitless0to100, `${part.id}.${c.key}`).toBe(false);
        if (c.quantity === "ratio") expect(c.max, `${part.id}.${c.key}`).toBeLessThanOrEqual(1);
      }
    }
    // The ones people asked about: the LDR in lux, the knob as a ratio with its track in ohms, the resistor in ohms.
    expect(findControl("ldr", "illuminance")).toMatchObject({ quantity: "illuminance", unit: "lx", min: 0, max: 100_000, slider: "log" });
    expect(findControl("potentiometer", "position")).toMatchObject({ quantity: "ratio", min: 0, max: 1 });
    expect(findControl("potentiometer", "track")).toMatchObject({ quantity: "resistance", default: 10_000 });
    expect(findControl("resistor", "ohms")).toMatchObject({ quantity: "resistance", min: 0.1, max: 10e6, default: 220 });
    expect(findControl("resistor", "tolerance")).toMatchObject({ kind: "select", default: "5" });
  });

  it("keeps a resistor's value to three significant digits rather than a step", () => {
    const c = findControl("resistor", "ohms")!;
    expect(coerceInput(c, 4700)).toBe(4700);
    expect(coerceInput(c, 4.7)).toBe(4.7);
    expect(coerceInput(c, 12345)).toBe(12300);
    expect(coerceInput(c, 0.01)).toBe(0.1);
    expect(coerceInput(c, 5e7)).toBe(10e6);
  });
});

describe("what the settings come to", () => {
  it("an LDR's resistance follows the light on it, from megohms in the dark to a few kΩ in daylight", () => {
    expect(ldrOhms(0)).toBe(1e6);
    expect(ldrOhms(10)).toBeCloseTo(15_000, 0);
    expect(ldrOhms(1000)).toBeLessThan(ldrOhms(10));
    expect(readoutsFor("ldr", { illuminance: 10 })).toEqual([{ label: "Resistance", value: "≈ 15 kΩ" }]);
  });

  it("a potentiometer's wiper is its share of the track", () => {
    expect(readoutsFor("potentiometer", { position: 0.25, track: 10_000 })).toEqual([{ label: "End A to wiper", value: "2.5 kΩ" }]);
    expect(readoutsFor("potentiometer", {})).toEqual([{ label: "End A to wiper", value: "5 kΩ" }]);
  });

  it("the light scale old sessions used maps to lux and back exactly", () => {
    for (const p of [0, 22, 30, 60, 100]) expect(lightPercentFromLux(luxFromLightPercent(p))).toBeCloseTo(p, 9);
    expect(luxFromLightPercent(0)).toBe(1);
    expect(luxFromLightPercent(100)).toBe(100_000);
  });
});

describe("a part's inputs from before SI units", () => {
  it("are converted, and moved to the new key where the old one named its unit", () => {
    expect(migrateNodeInputs("hc-sr04", { source: "set", distanceCm: 42 })).toEqual({ source: "set", distance: 0.42 });
    expect(migrateNodeInputs("arduino-uno", { delayMs: 250, warnCm: 30, gateOpen: 90, unknown: 3 })).toEqual({ delay: 0.25, warnDistance: 0.3, gateOpen: Number((Math.PI / 2).toPrecision(12)), unknown: 3 });
    expect(migrateNodeInputs("bmp280", { pressureHpa: 1000.5, temperatureC: 20 })).toEqual({ pressure: 100_050, temperatureC: 20 });
    expect(migrateNodeInputs("bno055", { headingDeg: 180 })).toEqual({ heading: Number(Math.PI.toPrecision(12)) });
    expect(migrateNodeInputs("resistor", { ohms: "4700" })).toEqual({ ohms: 4700 });
    expect(migrateNodeInputs("led", { anything: 1 })).toEqual({ anything: 1 });
  });
});
