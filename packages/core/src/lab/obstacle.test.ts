import { describe, expect, it } from "vitest";
import { HC_SR04_BEAM, NO_ECHO_CM, OBSTACLE_WIDTH, beamHalfWidth, echoOff } from "./obstacle";
import { alertOf, boardSettings, sampleSensor } from "./sketch";
import type { LabNode } from "./types";

const ahead = (distance: number, offset = 0) => ({ distance, offset, width: OBSTACLE_WIDTH });
const read = (distance: number, offset = 0) => echoOff(HC_SR04_BEAM, ahead(distance, offset))?.distance ?? null;

describe("the obstacle test: what an HC-SR04 hears off a board in front of it", () => {
  it("straight ahead, it reads the obstacle's distance, and follows it as it moves", () => {
    const path = [0.02, 0.1, 0.25, 0.5, 1, 2.5, 4];
    expect(path.map((d) => read(d))).toEqual(path);
    expect(echoOff(HC_SR04_BEAM, ahead(0.3))?.at).toEqual([0.3, 0]);
  });

  it("the beam is about 15° wide: 13 cm across at 50 cm", () => {
    expect(2 * beamHalfWidth(HC_SR04_BEAM, 0.5)).toBeCloseTo(0.1317, 4);
  });

  it("an obstacle half in the beam is heard at its nearest edge inside it", () => {
    // At 50 cm the beam reaches 6.6 cm to each side; a 10 cm board centered 10 cm to the left has its edge at 5 cm.
    expect(read(0.5, 0.1)).toBeCloseTo(Math.hypot(0.5, 0.05), 9);
    expect(read(0.5, -0.1)).toBeCloseTo(Math.hypot(0.5, 0.05), 9);
  });

  it("moved out of the beam, there is no echo; farther away the beam widens and finds it again", () => {
    expect(read(0.5, 0.2)).toBeNull();
    expect(read(1.5, 0.2)).toBeCloseTo(Math.hypot(1.5, 0.15), 9);
  });

  it("closer than 2 cm or farther than 4 m, there is no echo", () => {
    expect(read(0.015)).toBeNull();
    expect(read(4.01)).toBeNull();
    // Inside 4 m straight ahead but past it along the slant to the beam's edge.
    expect(read(3.99, beamHalfWidth(HC_SR04_BEAM, 3.99) + OBSTACLE_WIDTH / 2 - 0.001)).toBeNull();
  });

  it("refuses positions that aren't numbers", () => {
    expect(read(Number.NaN)).toBeNull();
    expect(read(0.3, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("the lab's HC-SR04 reads the obstacle (Stage 0: the reading changes as the obstacle moves)", () => {
  const node: LabNode = { id: "s1", partId: "hc-sr04", label: "HC-SR04", x: 0, y: 0, mode: "virtual" };
  const settings = boardSettings(null, undefined);
  const at = (distance: number, offset?: number) => sampleSensor(node, 3, { s1: { source: "set", distance, ...(offset === undefined ? {} : { offset }) } }, settings);

  it("moving the obstacle changes the reading the sketch and the emulated module get", () => {
    const readings = [0.1, 0.25, 0.42, 1.5].map((d) => at(d).values.distanceCm);
    expect(readings).toEqual([10, 25, 42, 150]);
    expect(at(0.25).readings[0]).toEqual({ label: "Distance", value: "25.0 cm" });
    expect(at(0.25).badge).toBe("25 cm");
  });

  it("an obstacle moved out of the beam gives no echo, and the warning clears", () => {
    expect(alertOf(at(0.1), settings)).toBe(true);
    const out = at(0.1, 0.3);
    expect(out.values.distanceCm).toBe(NO_ECHO_CM);
    expect(out.readings[0]).toEqual({ label: "Distance", value: "No echo" });
    expect(out.badge).toBe("No echo");
    expect(alertOf(out, settings)).toBe(false);
  });

  it("a session saved before the obstacle could move sideways reads as it always did", () => {
    expect(at(0.3).values.distanceCm).toBe(30);
    expect(sampleSensor(node, 3, { s1: { source: "set" } }, settings).values.distanceCm).toBe(30);
  });

  it("the simulated sweep still moves between 30 and 50 cm straight ahead", () => {
    const sweep = [0, 2, 5, 7.85].map((t) => sampleSensor(node, t, undefined, settings).values.distanceCm);
    expect(sweep[0]).toBe(30);
    for (const d of sweep) {
      expect(d).toBeGreaterThanOrEqual(30);
      expect(d).toBeLessThanOrEqual(50);
    }
    expect(new Set(sweep).size).toBe(sweep.length);
  });
});
