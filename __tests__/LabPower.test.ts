import { describe, expect, it } from "vitest";
import { getPart } from "@kiungo/core/parts";
import { analyze } from "@kiungo/core/lab/circuit";
import { planAutoWire } from "@kiungo/core/lab/autowire";
import { frameAt } from "@kiungo/core/lab/simulate";
import { SOURCE_KEY, SOURCE_SET, controlsFor } from "@kiungo/core/lab/controls";
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
    const { analysis, of, wires } = build("arduino-uno", "a4988", "lipo-3s", "nema17");
    const motor = of("nema17");
    expect(wires.filter((w) => w.to.node === motor.id)).toHaveLength(4);
    expect(analysis.nodes[motor.id].drivenBy).toBe(of("a4988").id);
    expect(titles(analysis.nodes[motor.id].faults)).not.toContain("Only one coil is wired");
  });

  it("runs clean from a 3S pack: the driver holds the current, so 11.1 V on a 2.55 V motor is how it is used", () => {
    const { nodes, wires, analysis, of } = build("arduino-uno", "lipo-3s", "a4988", "nema17");
    expect(analysis.faults.filter((f) => f.severity !== "tip")).toEqual([]);
    // Two windings held at 1 A, 1.5 Ω each, and the driver's own 0.64 W a winding, over 11.1 V; plus the chip's 12 mA.
    const pack = analysis.power.rails.find((r) => r.source.node === of("lipo-3s").id)!;
    expect(pack.typicalMa).toBeCloseTo(((2 * (1.5 + 0.64)) / 11.1) * 1000 + 12, 0);
    expect(pack.peakMa).toBeCloseTo(pack.typicalMa, 0);
    expect(analysis.power.heat[of("a4988").id].watts).toBeCloseTo(1.28, 2);
    const live = frameAt(nodes, wires, analysis, 1, true).nodes[of("nema17").id];
    expect(live.readings.find((r) => r.label === "Current")!.value).toMatch(/^1\.00 A a winding, held by /);
    expect(live.readings.find((r) => r.label === "At its terminals")!.value).toBe("About 1.5 V, chopped down from 11.1 V");
    expect(live.badge).toBe("6.3 rad/s");
  });

  it("a plain H-bridge on the same supply and motor still warns: nothing holds the current", () => {
    const { analysis, of } = build("arduino-uno", "lipo-3s", "l298n", "nema17");
    expect(titles(analysis.nodes[of("nema17").id].faults)).toContain("11.1 V on a 2.55 V motor");
  });

  it("a 2S pack is too little for the A4988, and the lab names the pin", () => {
    const { analysis, hints, of } = build("arduino-uno", "lipo-2s", "a4988");
    expect(hints.a4988).toMatch(/VMOT needs 8–35 V/);
    expect(titles(analysis.nodes[of("a4988").id].faults)).toContain("VMOT has no power");
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

describe("a board on a battery", () => {
  it("takes its supply through VIN, and the battery carries the board and everything on its 5 V pin", () => {
    const uno = node("arduino-uno");
    const battery = node("battery-9v");
    const servo = node("servo");
    const wires = [wire(battery, "POS", uno, "VIN"), wire(battery, "NEG", uno, "GND1"), wire(uno, "5V", servo, "VCC"), wire(uno, "GND2", servo, "GND"), wire(uno, "D9", servo, "SIG")];
    const analysis = analyze([uno, battery, servo], wires);
    const vin = analysis.nets.find((n) => n.pins.some((p) => p.node === uno.id && p.pin === "VIN"))!;
    expect(vin.kind).toBe("power");
    expect(vin.voltage).toBe(9);
    expect(vin.feeds).toEqual([{ node: uno.id, pin: "VIN" }]);
    // The 5 V pin is still the board's own 5 V, not the battery's 9 V.
    expect(analysis.nodes[servo.id].supplyV).toBe(5);
    const rail = analysis.power.rails.find((r) => r.source.node === battery.id)!;
    const servoDraw = getPart("servo")!.spec!.power.draw!.active;
    expect(rail.loads.map((l) => l.node)).toEqual([uno.id]);
    expect(rail.typicalMa).toBeGreaterThan(servoDraw);
    expect(rail.hours).toBeGreaterThan(0);
  });

  it("warms the board's regulator only when a battery feeds it, by the volts it drops", () => {
    const uno = node("arduino-uno");
    const battery = node("battery-9v");
    const servo = node("servo");
    const load = [wire(uno, "5V", servo, "VCC"), wire(uno, "GND2", servo, "GND"), wire(uno, "D9", servo, "SIG")];
    const onUsb = analyze([uno, servo], load);
    expect(onUsb.power.heat[uno.id]).toBeUndefined();
    const onBattery = analyze([uno, battery, servo], [...load, wire(battery, "POS", uno, "VIN"), wire(battery, "NEG", uno, "GND1")]);
    const heat = onBattery.power.heat[uno.id]!;
    // (9 V − 5 V) × (the board's own draw + the servo's).
    const amps = (getPart("arduino-uno")!.spec!.power.draw!.active + getPart("servo")!.spec!.power.draw!.active) / 1000;
    expect(heat.watts).toBeCloseTo(4 * amps, 5);
    expect(heat.tempC).toBeGreaterThan(60);
  });

  it("says when a battery is too weak or too strong for the board's input", () => {
    const uno = node("arduino-uno");
    const aa = node("battery-4aa");
    const low = analyze([uno, aa], [wire(aa, "POS", uno, "VIN"), wire(aa, "NEG", uno, "GND1")]);
    expect(titles(low.faults)).toContain("6 V is too little for VIN");
    const pico = node("raspberry-pi-pico");
    const nine = node("battery-9v");
    const high = analyze([pico, nine], [wire(nine, "POS", pico, "VSYS"), wire(nine, "NEG", pico, "GND1")]);
    expect(high.faults.find((f) => f.title === "9 V is too much for VSYS")?.severity).toBe("error");
  });

  it("flags a supply pin asked for more than it has", () => {
    const { analysis } = build("arduino-uno", "servo-mg996r");
    const budget = analysis.faults.find((f) => f.id.startsWith("budget:"))!;
    expect(budget.title).toMatch(/5 V is asked for more than it can give/);
    expect(budget.severity).toBe("warning");
  });
});

describe("a converter between a battery and a part", () => {
  it("is fed by the battery added before it, and gives a live 5 V only while it is fed", () => {
    const { nodes, wires, of } = build("arduino-uno", "battery-18650", "buck-converter");
    const converter = of("buck-converter");
    const battery = of("battery-18650");
    const servo = node("servo-mg996r");
    const uno = of("arduino-uno");
    const more = [...wires, wire(converter, "OUT_POS", servo, "VCC"), wire(converter, "OUT_NEG", servo, "GND"), wire(uno, "D9", servo, "SIG"), wire(uno, "GND1", converter, "OUT_NEG")];
    const analysis = analyze([...nodes, servo], more);
    expect(analysis.nodes[converter.id].status).toBe("ready");
    expect(analysis.nodes[servo.id].status).toBe("ready");
    expect(analysis.nodes[servo.id].supplyV).toBe(5);
    expect(titles(analysis.nodes[servo.id].faults)).not.toContain("No common ground with the board");
    // The battery sees the servo's power through the converter: less current at its higher voltage, plus what the converter wastes.
    const out = analysis.power.rails.find((r) => r.source.node === converter.id)!;
    const input = analysis.power.rails.find((r) => r.source.node === battery.id)!;
    expect(out.volts).toBe(5);
    expect(input.typicalMa).toBeLessThan(out.typicalMa);
    expect(input.typicalMa).toBeGreaterThan((out.typicalMa * 5) / 7.4);
    expect(analysis.power.heat[converter.id]!.watts).toBeGreaterThan(0);

    // Take the battery away and the converter's output is dead: the servo has no power.
    const unfed = analyze([...nodes, servo], more.filter((w) => w.from.node !== battery.id && w.to.node !== battery.id));
    expect(unfed.nodes[servo.id].powered).toBe(false);
  });
});

describe("parts described in data", () => {
  it("gives a sensor its controls and readings with no lab code of its own", () => {
    const { nodes, wires, analysis, of } = build("arduino-uno", "line-sensor");
    const sensor = of("line-sensor");
    expect(analysis.nodes[sensor.id].status).toBe("ready");
    const panel = controlsFor(sensor, nodes, analysis);
    expect(panel.title).toBe("Surroundings");
    expect(panel.controls.map((c) => c.key)).toEqual([SOURCE_KEY, "reflect"]);
    const dark = frameAt(nodes, wires, analysis, 1, true, { [sensor.id]: { [SOURCE_KEY]: SOURCE_SET, reflect: 0.1 } });
    expect(dark.nodes[sensor.id].readings[0]).toEqual({ label: "Light reflected", value: "10 %" });
    const bright = frameAt(nodes, wires, analysis, 1, true, { [sensor.id]: { [SOURCE_KEY]: SOURCE_SET, reflect: 0.9 } });
    // Its analog pin is wired by default, and follows the reading upside down: more light, lower voltage.
    const pin = (frame: typeof dark) => frame.pins[`${of("arduino-uno").id}:${wires.find((w) => w.to.pin === "AO")!.from.pin}`];
    expect(pin(dark)).toBeGreaterThan(pin(bright));
  });

  it("lets a bare button work on a 3.3 V board without a level fault", () => {
    const { analysis, of } = build("esp32", "push-button");
    expect(analysis.nodes[of("push-button").id].status).toBe("ready");
    expect(analysis.faults.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("puts a level shifter's low side on 3.3 V, and a 5 V signal through it reaches a 3.3 V board cleanly", () => {
    const { wires, of } = build("esp32", "level-shifter");
    const shifter = of("level-shifter");
    const supplyOf = (pin: string) => wires.find((w) => w.to.node === shifter.id && w.to.pin === pin)!.from.pin;
    expect(supplyOf("LV")).toBe("3V3");
    expect(supplyOf("HV")).toBe("VIN");

    const esp = node("esp32");
    const sonar = node("hc-sr04");
    const lv = node("level-shifter");
    const direct = [wire(esp, "VIN", sonar, "VCC"), wire(esp, "GND1", sonar, "GND"), wire(esp, "D5", sonar, "TRIG"), wire(esp, "D18", sonar, "ECHO")];
    expect(titles(analyze([esp, sonar], direct).faults)).toContain("5 V output into a 3.3 V pin");
    const shifted = [...direct.slice(0, 3), wire(sonar, "ECHO", lv, "HV1"), wire(lv, "LV1", esp, "D18"), wire(esp, "VIN", lv, "HV"), wire(esp, "3V3", lv, "LV"), wire(esp, "GND2", lv, "GND")];
    const fixed = analyze([esp, sonar, lv], shifted);
    expect(titles(fixed.faults)).not.toContain("5 V output into a 3.3 V pin");
    expect(fixed.nodes[sonar.id].status).toBe("ready");
  });

  it("treats a servo driver's outputs as the board's own PWM pins", () => {
    const { nodes, wires, of } = build("arduino-uno", "pca9685");
    const servo = node("servo");
    const uno = of("arduino-uno");
    const all = [...wires, wire(of("pca9685"), "PWM0", servo, "SIG"), wire(uno, "5V", servo, "VCC"), wire(uno, "GND1", servo, "GND")];
    const analysis = analyze([...nodes, servo], all);
    expect(analysis.nodes[servo.id].status).toBe("ready");
    expect(analysis.nodes[servo.id].links.find((l) => l.pin === "SIG")).toMatchObject({ board: uno.id, boardPin: "PWM0" });
  });
});

