import { describe, expect, it } from "vitest";
import { getPinout } from "./pinout";
import { planAutoWire } from "./autowire";
import type { LabNode, LabWire } from "./types";

const node = (id: string, partId: string, x: number, y = 0): LabNode => ({ id, partId, label: partId, x, y, mode: "virtual" });

/** The board pin a part's pin was wired to. */
function boardEnd(plan: ReturnType<typeof planAutoWire>, partId: string, partPin: string): string | undefined {
  const wire = plan.wires.find((w) => (w.from.node === partId && w.from.pin === partPin) || (w.to.node === partId && w.to.pin === partPin));
  if (!wire) return undefined;
  return wire.from.node === partId ? wire.to.pin : wire.from.pin;
}

describe("auto-wire takes power from the power header, never a programming header (B6)", () => {
  it("the Uno has a 5V on its ICSP header, marked as such", () => {
    const icsp = getPinout("arduino-uno").pins.find((p) => p.id === "5V_ICSP")!;
    expect(icsp.supplies).toBe(5);
    expect(icsp.programmingHeader).toBe(true);
    expect(getPinout("arduino-uno").pins.find((p) => p.id === "5V")!.programmingHeader).toBeUndefined();
  });

  // The ICSP header is on the Uno's right edge, so a part to the right was wired to it: the bug.
  for (const [where, x] of [
    ["to the right of the board", 400],
    ["to the left of the board", -300],
  ] as const) {
    it(`an LDR ${where} gets its VCC from 5V`, () => {
      const uno = node("uno", "arduino-uno", 0);
      const ldr = node("ldr", "ldr", x);
      const plan = planAutoWire(ldr, [uno, ldr], []);
      const vcc = getPinout("ldr").pins.find((p) => p.role === "vcc")!;
      expect(boardEnd(plan, "ldr", vcc.id)).toBe("5V");
      expect(plan.wires.some((w) => w.from.pin === "5V_ICSP" || w.to.pin === "5V_ICSP")).toBe(false);
    });
  }

  it("so does every other 5 V part on an Uno or a Mega, wherever it sits", () => {
    for (const board of ["arduino-uno", "arduino-mega"]) {
      for (const partId of ["ldr", "lcd-16x2", "dht11", "hc-sr04", "pir", "servo"]) {
        const b = node("b", board, 0);
        const part = node("p", partId, 500);
        const plan = planAutoWire(part, [b, part], []);
        const ends = plan.wires.flatMap((w) => [w.from, w.to]).filter((r) => r.node === "b").map((r) => r.pin);
        expect(ends, `${partId} on ${board}`).not.toContain("5V_ICSP");
      }
    }
  });

  it("a breadboard's + rail is fed from 5V, not 5V ICSP", () => {
    const uno = node("uno", "arduino-uno", 0);
    const bb = node("bb", "breadboard", 400);
    const plan = planAutoWire(bb, [uno, bb], [] as LabWire[]);
    const ends = plan.wires.flatMap((w) => [w.from, w.to]).filter((r) => r.node === "uno").map((r) => r.pin);
    expect(ends).toContain("5V");
    expect(ends).not.toContain("5V_ICSP");
  });
});
