import { describe, expect, it } from "vitest";
import { getPart } from "@kiungo/core/parts";
import { analyze } from "@kiungo/core/lab/circuit";
import { planAutoWire } from "@kiungo/core/lab/autowire";
import { frameAt } from "@kiungo/core/lab/simulate";
import type { LabNode, LabWire } from "@kiungo/core/lab/types";

/**
 * The lab's electrical model for the parts that are not a board's
 * peripherals: batteries, converters, motor drivers and the motors they run.
 */

let seq = 0;
const node = (partId: string, label = getPart(partId)?.name ?? partId): LabNode => ({ id: `n${++seq}`, partId, label, x: seq * 220, y: 0, mode: "virtual" });
const wire = (a: LabNode, ap: string, b: LabNode, bp: string): LabWire => ({ id: `w${++seq}`, from: { node: a.id, pin: ap }, to: { node: b.id, pin: bp } });

/** A build put together the way the lab does it: each part added and auto-wired in turn. */
function build(...partIds: string[]) {
  let nodes: LabNode[] = [];
  let wires: LabWire[] = [];
  const hints: Record<string, string | undefined> = {};
  for (const partId of partIds) {
    const added = node(partId);
    nodes = [...nodes, added];
    const plan = planAutoWire(added, nodes, wires);
    const remove = new Set(plan.remove ?? []);
    wires = [...wires.filter((w) => !remove.has(w.id)), ...plan.wires.map((w) => ({ id: `w${++seq}`, ...w }))];
    hints[partId] = plan.hint;
  }
  const of = (partId: string) => nodes.find((n) => n.partId === partId)!;
  return { nodes, wires, hints, of, analysis: analyze(nodes, wires) };
}
const titles = (faults: Array<{ title: string }>) => faults.map((f) => f.title);

describe("a battery, a driver and a motor", () => {
  it("auto-wires the chain a robot car needs and reports every part ready", () => {
    const { analysis, of, wires } = build("arduino-uno", "tb6612fng", "battery-4aa", "micro-gear-motor");
    const driver = of("tb6612fng");
    const battery = of("battery-4aa");
    const motor = of("micro-gear-motor");
    // The battery feeds the driver's motor supply; the board feeds its logic and its control pins.
    expect(wires.some((w) => w.from.node === driver.id && w.from.pin === "VM" && w.to.node === battery.id && w.to.pin === "POS")).toBe(true);
    expect(analysis.nodes[driver.id].status).toBe("ready");
    expect(analysis.nodes[driver.id].supplyV).toBe(6);
    expect(analysis.nodes[motor.id].status).toBe("ready");
    expect(analysis.nodes[motor.id].drivenBy).toBe(driver.id);
    expect(analysis.nodes[battery.id].status).toBe("ready");
    expect(analysis.faults.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("budgets the battery: what the motor and the driver draw, and how long it lasts", () => {
    const { analysis, of } = build("arduino-uno", "tb6612fng", "battery-4aa", "micro-gear-motor");
    const battery = of("battery-4aa");
    const rail = analysis.power.rails.find((r) => r.source.node === battery.id)!;
    const run = getPart("micro-gear-motor")!.spec!.power.motor!.runMa;
    expect(rail.volts).toBe(6);
    expect(rail.typicalMa).toBeGreaterThanOrEqual(run);
    expect(rail.peakMa).toBeGreaterThanOrEqual(getPart("micro-gear-motor")!.spec!.power.motor!.stallMa);
    expect(rail.capacityMa).toBe(getPart("battery-4aa")!.spec!.power.source!.maxMa);
    expect(rail.hours).toBeCloseTo(getPart("battery-4aa")!.spec!.power.source!.capacityMah! / rail.typicalMa, 5);
  });

  it("moves a driver's motor supply from the board to a battery added later", () => {
    const first = build("arduino-uno", "l298n");
    const parked = first.wires.find((w) => w.to.pin === "VS")!;
    expect(first.nodes.find((n) => n.id === parked.from.node)!.partId).toBe("arduino-uno");
    const { wires, of, analysis } = build("arduino-uno", "l298n", "lipo-2s");
    const vs = wires.filter((w) => (w.to.node === of("l298n").id && w.to.pin === "VS") || (w.from.node === of("l298n").id && w.from.pin === "VS"));
    expect(vs).toHaveLength(1);
    expect([vs[0].from.node, vs[0].to.node]).toContain(of("lipo-2s").id);
    expect(analysis.nodes[of("l298n").id].supplyV).toBe(7.4);
  });

  it("shows the motor turning and what the driver costs it while the build runs", () => {
    const { nodes, wires, analysis, of } = build("arduino-uno", "l298n", "lipo-2s", "micro-gear-motor");
    const frame = frameAt(nodes, wires, analysis, 3, true);
    const live = frame.nodes[of("micro-gear-motor").id];
    expect(live.on).toBe(true);
    const lost = live.readings.find((r) => r.label === "At its terminals")!.value;
    // An L298N keeps about 1.2 V for itself even at this small current.
    expect(lost).toMatch(/lost in the driver/);
    expect(frame.nodes[of("lipo-2s").id].readings.find((r) => r.label === "Lasts about")).toBeDefined();
    expect(analysis.power.heat[of("l298n").id]?.watts).toBeGreaterThan(0);
  });

  it("refuses to run a motor from a board pin and says what to use", () => {
    const uno = node("arduino-uno");
    const motor = node("micro-gear-motor");
    const analysis = analyze([uno, motor], [wire(uno, "D9", motor, "M1"), wire(uno, "GND1", motor, "M2")]);
    expect(analysis.nodes[motor.id].status).toBe("fault");
    expect(titles(analysis.nodes[motor.id].faults)).toContain("A board pin can't run a motor");
  });

  it("leaves a motor unwired until the build has a driver, and says so", () => {
    const { wires, hints } = build("arduino-uno", "micro-gear-motor");
    expect(wires).toEqual([]);
    expect(hints["micro-gear-motor"]).toMatch(/motor driver first/);
  });

  it("warns when a driver's motor supply is too low for it", () => {
    const uno = node("arduino-uno");
    const driver = node("tb6612fng");
    const analysis = analyze([uno, driver], [wire(uno, "5V", driver, "VCC"), wire(uno, "3V3", driver, "VM"), wire(uno, "GND1", driver, "GND"), wire(uno, "D2", driver, "AIN1"), wire(uno, "D4", driver, "STBY")]);
    expect(titles(analysis.nodes[driver.id].faults)).toContain("Underpowered at 3.3 V");
  });

  it("wants both of a driver's supplies", () => {
    const uno = node("arduino-uno");
    const driver = node("tb6612fng");
    const analysis = analyze([uno, driver], [wire(uno, "5V", driver, "VCC"), wire(uno, "GND1", driver, "GND"), wire(uno, "D2", driver, "AIN1"), wire(uno, "D4", driver, "STBY")]);
    expect(analysis.nodes[driver.id].powered).toBe(false);
    expect(titles(analysis.nodes[driver.id].faults)).toContain("VM has no power");
  });
});

describe("a stepper on a stepper driver", () => {
  it("takes both channels, one coil each", () => {
    const { analysis, of, wires } = build("arduino-uno", "a4988", "lipo-2s", "nema17");
    const motor = of("nema17");
    expect(wires.filter((w) => w.to.node === motor.id)).toHaveLength(4);
    expect(analysis.nodes[motor.id].drivenBy).toBe(of("a4988").id);
    expect(titles(analysis.nodes[motor.id].faults)).not.toContain("Only one coil is wired");
  });

  it("says so when only one coil is wired", () => {
    const driver = node("a4988");
    const motor = node("nema17");
    const analysis = analyze([driver, motor], [wire(driver, "1A", motor, "A1"), wire(driver, "1B", motor, "A2")]);
    expect(titles(analysis.nodes[motor.id].faults)).toContain("Only one coil is wired");
  });
});

describe("a part on its own supply", () => {
  it("needs the board's ground joined to the battery's", () => {
    const uno = node("arduino-uno");
    const battery = node("battery-4aa");
    const servo = node("servo-mg996r");
    const own = [wire(battery, "POS", servo, "VCC"), wire(battery, "NEG", servo, "GND"), wire(uno, "D9", servo, "SIG")];
    const apart = analyze([uno, battery, servo], own);
    expect(titles(apart.nodes[servo.id].faults)).toContain("No common ground with the board");
    const joined = analyze([uno, battery, servo], [...own, wire(uno, "GND1", battery, "NEG")]);
    expect(titles(joined.nodes[servo.id].faults)).not.toContain("No common ground with the board");
    expect(joined.nodes[servo.id].status).toBe("ready");
    expect(joined.nodes[servo.id].supplyV).toBe(6);
  });

  it("is a short when a battery's two terminals are joined", () => {
    const battery = node("lipo-2s");
    const other = node("battery-4aa");
    const analysis = analyze([battery, other], [wire(battery, "POS", battery, "NEG")]);
    expect(titles(analysis.faults)).toContain("Short circuit: power wired straight to ground");
  });
});
