// @vitest-environment node
/**
 * Stage 0's obstacle test, end to end: an obstacle moved in the lab changes
 * what the HC-SR04 tells the user's own, unchanged sketch. The sketch is
 * Kiungo's Distance sensor starter for the Uno (fixtures/sketches), built as
 * Arduino CLI builds it; the module answers its pulseIn() through the
 * emulator, with the reading the lab's obstacle gives.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UNO } from "../src/boards";
import { AvrBoard } from "../src/emulator";
import { Peripherals } from "../src/emulator/peripherals";
import { analyze } from "../src/lab/circuit";
import { peripheralInputs } from "../src/lab/program";
import { buildStarter } from "../src/project";

function distanceSketch() {
  const { session } = buildStarter({ name: "x", board: "arduino-uno", starter: "distance" });
  const analysis = analyze(session.nodes, session.wires, session.inputs);
  const board = session.nodes[0];
  const sensor = session.nodes.find((n) => n.partId === "hc-sr04")!;
  const avr = new AvrBoard(UNO, readFileSync(join(__dirname, "fixtures", "sketches", "distance-uno.hex"), "utf8"));
  let serial = "";
  avr.onSerialByte((b) => (serial += String.fromCharCode(b)));
  const peripherals = new Peripherals(avr);
  /** Put the obstacle there (meters) and let the sketch measure it for a while; what it printed meanwhile. */
  const obstacleAt = (distance: number, offset = 0, ms = 450) => {
    const inputs = { [sensor.id]: { source: "set", distance, offset } };
    peripherals.apply(peripheralInputs(session.nodes, analysis, inputs, board.id, 0).inputs);
    const from = serial.length;
    avr.runMs(ms);
    return serial.slice(from).split("\r\n").filter(Boolean);
  };
  return { obstacleAt };
}

describe("the obstacle test against real firmware (Stage 0)", () => {
  it("the unchanged Distance sketch prints the obstacle's distance as it moves", () => {
    const { obstacleAt } = distanceSketch();
    const printed = [0.1, 0.25, 0.6].map((d) => obstacleAt(d).at(-1));
    expect(printed.map((line) => Number.parseFloat(line ?? ""))).toEqual([expect.closeTo(10, 0), expect.closeTo(25, 0), expect.closeTo(60, 0)]);
  }, 30_000);

  it("moved out of the beam, the sketch hears nothing", () => {
    const { obstacleAt } = distanceSketch();
    expect(Number.parseFloat(obstacleAt(0.3).at(-1) ?? "")).toBeCloseTo(30, 0);
    expect(obstacleAt(0.3, 0.3, 600).at(-1)).toBe("Nothing in range");
  }, 30_000);
});
