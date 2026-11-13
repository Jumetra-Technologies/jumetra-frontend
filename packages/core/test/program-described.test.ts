// @vitest-environment node
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lab/circuit";
import { planAutoWire } from "../src/lab/autowire";
import { arduinoPinOf, peripheralInputs, programFrame, servoAngle, type ProgramReadings } from "../src/lab/program";
import { frameAt } from "../src/lab/simulate";
import { hybridBindings, hybridValues } from "../src/hybrid/plan";
import type { PinReading } from "../src/emulator/pinstats";
import type { LabNode, LabWire } from "../src/lab/types";

/**
 * Parts described in data (a `sim` block in their file) under the user's own
 * program: sensors and controls answer it on their pins, in the emulator and
 * in a Hybrid run, and motors turn as the program drives their driver.
 */

let seq = 0;
const pin = (n: number, over: Partial<PinReading> = {}): PinReading => ({ pin: n, level: "low", duty: 0, hz: 0, pulseUs: null, ...over });

/** A build put together the way the lab does it: each part added and auto-wired in turn. */
function build(...partIds: string[]) {
  let nodes: LabNode[] = [];
  let wires: LabWire[] = [];
  for (const partId of partIds) {
    const added: LabNode = { id: `n${++seq}`, partId, label: partId, x: seq * 200, y: 0, mode: "virtual" };
    nodes = [...nodes, added];
    const plan = planAutoWire(added, nodes, wires);
    const remove = new Set(plan.remove ?? []);
    wires = [...wires.filter((w) => !remove.has(w.id)), ...plan.wires.map((w) => ({ id: `w${++seq}`, ...w }))];
  }
  const analysis = analyze(nodes, wires);
  const of = (partId: string) => nodes.find((n) => n.partId === partId)!;
  const board = nodes[0];
  /** The Arduino pin number a part's pin is wired to. */
  const on = (partId: string, pinId: string) => arduinoPinOf(analysis.nodes[of(partId).id].links.find((l) => l.pin === pinId)!.boardPin)!;
  const base = frameAt(nodes, wires, analysis, 1, true);
  const frame = (pins: PinReading[], over: Partial<ProgramReadings> = {}) => programFrame(base, nodes, wires, analysis, { boardId: board.id, t: 1, speedPercent: 100, pins, crashed: null, ...over });
  return { nodes, wires, analysis, of, board, on, frame };
}

describe("described sensors and controls answering the program", () => {
  it("a push button reads low while pressed and high when released", () => {
    const { nodes, analysis, of, board, on } = build("arduino-uno", "push-button");
    const button = of("push-button");
    const read = (pressed: boolean) => peripheralInputs(nodes, analysis, { [button.id]: { source: "set", pressed } }, board.id, 0);
    expect(read(true)).toEqual({ inputs: [{ kind: "digital", id: `${button.id}:OUT`, pin: on("push-button", "OUT"), high: false }], unsupported: [] });
    expect(read(false).inputs[0]).toMatchObject({ high: true });
  });

  it("a potentiometer gives the share of its supply its knob is turned to, on an analog pin", () => {
    const { nodes, analysis, of, board, on } = build("arduino-uno", "potentiometer");
    const knob = of("potentiometer");
    const p = on("potentiometer", "OUT");
    expect(p).toBeGreaterThanOrEqual(14);
    const { inputs } = peripheralInputs(nodes, analysis, { [knob.id]: { source: "set", position: 0.25 } }, board.id, 0);
    expect(inputs).toEqual([{ kind: "analog", id: `${knob.id}:OUT`, pin: p, volts: 1.25 }]);
  });

  it("a sensor that only talks over I2C is listed as one the emulator can't answer for yet", () => {
    const { nodes, analysis, of, board } = build("arduino-uno", "vl53l0x");
    const { inputs, unsupported } = peripheralInputs(nodes, analysis, undefined, board.id, 0);
    expect(inputs).toEqual([]);
    expect(unsupported).toEqual([of("vl53l0x")]);
  });

  it("the same parts are played on a real board in a Hybrid run, under the same ids", () => {
    const built = build("arduino-uno", "push-button", "potentiometer", "vl53l0x");
    const nodes = built.nodes.map((n, i) => (i === 0 ? { ...n, mode: "physical" as const } : n));
    const analysis = analyze(nodes, built.wires);
    const button = built.of("push-button");
    const knob = built.of("potentiometer");
    const b = hybridBindings(nodes, analysis, nodes[0].id);
    expect(b.sensors.map((s) => [s.inputId, s.binding])).toEqual([
      [`${button.id}:OUT`, { kind: "digital", pin: built.on("push-button", "OUT") }],
      [`${knob.id}:OUT`, { kind: "analog", pin: built.on("potentiometer", "OUT") }],
    ]);
    expect(b.unsupported.map((u) => u.node.partId)).toEqual(["vl53l0x"]);
    expect(b.unsupported[0].why).toMatch(/Mark it Physical/);
    const { inputs } = peripheralInputs(nodes, analysis, { [button.id]: { source: "set", pressed: true }, [knob.id]: { source: "set", position: 0.5 } }, nodes[0].id, 0);
    expect(hybridValues(b, inputs)).toEqual([
      [0, 0],
      [1, 512],
    ]);
  });
});

describe("motors under the program's control", () => {
  it("an H-bridge channel turns its motor while IN1 and IN2 differ, at the duty of its PWM, and only out of standby", () => {
    const { of, on, frame } = build("arduino-uno", "battery-18650", "tb6612fng", "micro-gear-motor");
    const motor = of("micro-gear-motor");
    const [in1, in2, pwm, stby] = ["AIN1", "AIN2", "PWMA", "STBY"].map((p) => on("tb6612fng", p));
    const high = (n: number, duty = 1) => pin(n, { level: "high", duty });
    const forward = frame([high(in1), pin(in2), high(pwm, 0.5), high(stby)]).nodes[motor.id];
    expect(forward).toMatchObject({ on: true, level: 0.5 });
    expect(forward.readings.find((r) => r.label === "Direction")!.value).toBe("Forward");
    expect(frame([pin(in1), high(in2), high(pwm), high(stby)]).nodes[motor.id].readings.find((r) => r.label === "Direction")!.value).toBe("Reverse");
    expect(frame([high(in1), high(in2), high(pwm), high(stby)]).nodes[motor.id].badge).toBe("Stopped");
    expect(frame([high(in1), pin(in2), high(pwm), pin(stby)]).nodes[motor.id].badge).toBe("Stopped");
  });

  it("a stepper driver steps its motor once for each pulse on STEP: 400 a second is 120 rpm", () => {
    const { of, on, frame } = build("arduino-uno", "lipo-3s", "a4988", "nema17");
    const motor = of("nema17");
    const step = on("a4988", "STEP");
    const dir = on("a4988", "DIR");
    const turning = frame([pin(step, { level: "high", duty: 0.5, hz: 400 }), pin(dir, { level: "high", duty: 1 })]).nodes[motor.id];
    expect(turning).toMatchObject({ on: true, badge: "12.6 rad/s" });
    expect(frame([pin(step), pin(dir)]).nodes[motor.id].badge).toBe("Stopped");
  });

  it("the MG996R follows its pulse like the SG90", () => {
    const { of, on, frame } = build("arduino-uno", "servo-mg996r");
    const servo = of("servo-mg996r");
    const live = frame([pin(on("servo-mg996r", "SIG"), { level: "high", duty: 0.075, hz: 50, pulseUs: 1500 })]).nodes[servo.id];
    expect(live.angle).toBeCloseTo(servoAngle(1500), 5);
    expect(live.badge).toBe(`${Math.round(servoAngle(1500))}°`);
  });
});
