/**
 * The lab's power budget.
 *
 * Every supply in a build (a board's 5 V pin, a battery, a converter's
 * output) can give so much current, and the parts wired to it ask for so
 * much. This file adds the asking up, follows it back through converters and
 * boards to whatever feeds them, and says where a supply is asked for more
 * than it has, how long a battery lasts, and which parts get hot doing their
 * job. The numbers come from each part's `spec` (see parts/types.ts).
 */

import { getPart } from "../parts";
import { bridgeInput, bridgeLoss, converterInput, converterLoss, heatFor, typicalHeat, windingAmps, type Heat } from "../parts/power";
import type { Pinout } from "../parts/types";
import type { Fault, Net, NodeReport } from "./circuit";
import type { LabNode, NodeInputs } from "./types";

export interface RailLoad {
  node: string;
  /** mA while working. */
  typicalMa: number;
  /** mA at worst: a stalled motor, a radio's transmit burst. */
  peakMa: number;
}

/** One supply and what hangs on it. */
export interface Rail {
  net: string;
  /** "Arduino Uno 5V", "4 x AA battery". */
  label: string;
  volts: number;
  source: { node: string; pin: string };
  /** What the supply can give, in mA, when its spec says. */
  capacityMa?: number;
  typicalMa: number;
  peakMa: number;
  loads: RailLoad[];
  /** For a battery: hours it lasts at the typical draw. */
  hours?: number;
}

export interface PowerReport {
  rails: Rail[];
  /** What each part draws from its supply, by node id. */
  draw: Record<string, RailLoad>;
  /** How warm the parts that lose power get, by node id. */
  heat: Record<string, Heat>;
  faults: Fault[];
}

/** A red LED through 220 Ω from 5 V, when nothing better is known. */
const LED_MA = 14;

const ma = (n: number) => (n >= 1000 ? `${Math.round(n / 10) / 100} A` : `${Math.round(n)} mA`);

export function powerBudget(args: {
  nodes: LabNode[];
  nets: Net[];
  netOfPin: Map<string, string>;
  reports: Record<string, NodeReport>;
  pinouts: Map<string, Pinout>;
  inputs?: Record<string, NodeInputs>;
}): PowerReport {
  const { nodes, nets, netOfPin, reports, pinouts } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const partOf = (id: string) => getPart(byId.get(id)?.partId ?? "");
  const nameOf = (id: string) => byId.get(id)?.label || partOf(id)?.name || id;
  const netOf = (node: string, pin: string) => nets.find((n) => n.id === netOfPin.get(`${node}:${pin}`));
  const powerNets = nets.filter((n) => n.kind === "power" && n.source && n.voltage !== undefined);
  /** The power nets a part supplies: a board's rails, a converter's outputs. */
  const suppliedBy = (node: string) => powerNets.filter((n) => n.source!.node === node);
  const motorsOn = (driver: string) => nodes.filter((n) => reports[n.id]?.drivenBy === driver && partOf(n.id)?.sim?.kind === "motor");
  /** The motors a driver runs, each with how many windings it has on the driver: two for a stepper. */
  const turnedBy = (driver: string) =>
    motorsOn(driver).flatMap((m) => {
      const part = partOf(m.id);
      const motor = part?.spec?.power.motor;
      return motor ? [{ motor, windings: part?.sim?.kind === "motor" && part.sim.second ? 2 : 1 }] : [];
    });

  const draw: Record<string, RailLoad> = {};
  const memo = new Map<string, RailLoad[]>();
  const busy = new Set<string>();
  const sum = (loads: RailLoad[]) => loads.reduce((t, l) => ({ typicalMa: t.typicalMa + l.typicalMa, peakMa: t.peakMa + l.peakMa }), { typicalMa: 0, peakMa: 0 });

  /** Everything a power net is asked for: its own parts, and what the converters and boards it feeds pass on. */
  const loadsOf = (net: Net): RailLoad[] => {
    const hit = memo.get(net.id);
    if (hit) return hit;
    if (busy.has(net.id)) return [];
    busy.add(net.id);
    const loads = new Map<string, RailLoad>();
    const add = (node: string, typicalMa: number, peakMa: number) => {
      if (typicalMa <= 0 && peakMa <= 0) return;
      const cur = loads.get(node) ?? { node, typicalMa: 0, peakMa: 0 };
      loads.set(node, { node, typicalMa: cur.typicalMa + typicalMa, peakMa: cur.peakMa + Math.max(peakMa, typicalMa) });
    };
    for (const ref of net.pins) {
      if (ref.node === net.source!.node) continue;
      const part = partOf(ref.node);
      const pinout = pinouts.get(ref.node);
      const pin = pinout?.pins.find((p) => p.id === ref.pin);
      const report = reports[ref.node];
      if (!part || !pin) continue;
      const spec = part.spec;
      const sim = part.sim;

      // A board fed here (VIN on a battery): its own draw plus all it passes on through its rails.
      if (net.feeds?.some((f) => f.node === ref.node && f.pin === ref.pin)) {
        const passed = sum(suppliedBy(ref.node).flatMap(loadsOf));
        add(ref.node, (spec?.power.draw?.active ?? 50) + passed.typicalMa, (spec?.power.draw?.peak ?? spec?.power.draw?.active ?? 50) + passed.peakMa);
        continue;
      }
      // A converter's input: what its outputs are asked for, turned back into input current.
      if (sim?.kind === "converter" && ref.pin === sim.input[0] && spec?.power.converter) {
        const out = sum(suppliedBy(ref.node).flatMap(loadsOf));
        const quiet = spec.power.draw?.idle ?? 5;
        add(ref.node, converterInput(spec.power.converter, net.voltage!, out.typicalMa / 1000) * 1000 + quiet, converterInput(spec.power.converter, net.voltage!, out.peakMa / 1000) * 1000 + quiet);
        continue;
      }
      // A driver's motor supply: its own logic, and the motors it runs.
      if (sim?.kind === "driver" && ref.pin === sim.supply) {
        const bridge = spec?.power.bridge;
        const asked = (stalled: boolean) => turnedBy(ref.node).reduce((t, { motor, windings }) => t + bridgeInput(bridge, motor, net.voltage!, windings, stalled ? motor.stallMa : motor.runMa) * 1000, 0);
        add(ref.node, (spec?.power.draw?.active ?? 0) + asked(false), (spec?.power.draw?.peak ?? spec?.power.draw?.active ?? 0) + asked(true));
        continue;
      }
      // A motor straight on the supply, or switched to it.
      if (sim?.kind === "motor" && (sim.terminals.includes(ref.pin) || sim.second?.includes(ref.pin))) {
        // One run by a driver is counted on the driver's supply instead.
        const viaDriver = report?.drivenBy && partOf(report.drivenBy)?.sim?.kind === "driver";
        if (report?.powered && !viaDriver) add(ref.node, spec?.power.motor?.runMa ?? 0, spec?.power.motor?.stallMa ?? 0);
        continue;
      }
      // Any other part on its supply pin.
      if (pin.role === "vcc" && report?.powered) {
        if (spec?.power.draw) add(ref.node, spec.power.draw.active, spec.power.draw.peak ?? spec.power.draw.active);
        continue;
      }
      // An LED wired to the rail itself is on all the time.
      if ((part.id === "led" || part.id === "rgb-led") && report?.powered && pin.role === "drive") add(ref.node, LED_MA, LED_MA);
    }
    busy.delete(net.id);
    const list = [...loads.values()].sort((a, b) => b.typicalMa - a.typicalMa);
    memo.set(net.id, list);
    return list;
  };

  const rails: Rail[] = [];
  const faults: Fault[] = [];
  const heat: Record<string, Heat> = {};

  for (const net of powerNets) {
    const source = net.source!;
    const part = partOf(source.node);
    const spec = part?.spec;
    const sim = part?.sim;
    const loads = loadsOf(net);
    if (!loads.length && !net.wires.length) continue;
    const total = sum(loads);
    for (const load of loads) draw[load.node] = { node: load.node, typicalMa: (draw[load.node]?.typicalMa ?? 0) + load.typicalMa, peakMa: (draw[load.node]?.peakMa ?? 0) + load.peakMa };

    // What the supply can give.
    let capacityMa: number | undefined;
    const pinLabel = pinouts.get(source.node)?.pins.find((p) => p.id === source.pin)?.label ?? source.pin;
    if (sim?.kind === "source") capacityMa = spec?.power.source?.maxMa;
    else if (sim?.kind === "converter") capacityMa = source.pin === sim.output[0] ? spec?.power.converter?.maxMa : sim.also?.find((o) => o.pin === source.pin)?.maxMa;
    else {
      // A board: any of its pins on this net that the spec gives a figure for.
      const figures = net.pins.filter((ref) => ref.node === source.node).map((ref) => spec?.power.rails?.find((r) => r.pin === ref.pin)?.maxMa);
      const known = figures.filter((f): f is number => f !== undefined);
      if (known.length) capacityMa = Math.max(...known);
    }
    // A board's pins on one supply are one rail, so name it by its voltage, not by whichever pin came first.
    const label = sim?.kind === "source" ? nameOf(source.node) : sim?.kind === "converter" ? `${nameOf(source.node)} ${pinLabel}` : `${nameOf(source.node)} ${net.voltage} V`;
    const rail: Rail = { net: net.id, label, volts: net.voltage!, source, capacityMa, typicalMa: total.typicalMa, peakMa: total.peakMa, loads };
    const capacityMah = spec?.power.source?.capacityMah;
    if (sim?.kind === "source" && capacityMah && total.typicalMa > 0) rail.hours = capacityMah / total.typicalMa;
    rails.push(rail);

    if (capacityMa !== undefined && loads.length) {
      const biggest = loads[0];
      const worst = [...loads].sort((a, b) => b.peakMa - a.peakMa)[0];
      if (total.typicalMa > capacityMa) {
        faults.push({
          id: `budget:${source.node}:${source.pin}`,
          severity: "warning",
          title: `${label} is asked for more than it can give`,
          detail: `The parts on it draw about ${ma(total.typicalMa)}; it gives about ${ma(capacityMa)}. Expect the voltage to sag and the board to reset. The biggest load is ${nameOf(biggest.node)} (${ma(biggest.typicalMa)}): give it its own supply.`,
          nodes: [source.node, biggest.node],
          wires: [],
        });
      } else if (total.peakMa > capacityMa) {
        faults.push({
          id: `budget-peak:${source.node}:${source.pin}`,
          severity: "tip",
          title: `${label} is fine until something stalls`,
          detail: `The parts on it draw about ${ma(total.typicalMa)} of the ${ma(capacityMa)} it gives, but up to ${ma(total.peakMa)} at worst. ${nameOf(worst.node)} alone can ask for ${ma(worst.peakMa)}: if the board resets when it starts or stalls, give it its own supply.`,
          nodes: [source.node, worst.node],
          wires: [],
        });
      }
    }
  }

  // Heat: converters by what they pass, drivers by what their motors draw, and anything that just runs warm.
  for (const node of nodes) {
    const part = partOf(node.id);
    const spec = part?.spec;
    const sim = part?.sim;
    const report = reports[node.id];
    if (!spec?.thermal || !report?.powered) continue;
    let found: Heat | null = null;
    if (sim?.kind === "converter" && spec.power.converter) {
      const input = netOf(node.id, sim.input[0]);
      const out = sum(suppliedBy(node.id).flatMap(loadsOf));
      if (input?.voltage !== undefined && out.typicalMa > 0) {
        found = heatFor(spec, converterLoss(spec.power.converter, input.voltage, out.typicalMa / 1000), `giving ${ma(out.typicalMa)} from ${input.voltage} V`);
      }
    } else if (sim?.kind === "driver" && spec.power.bridge) {
      const motors = turnedBy(node.id);
      const watts = motors.reduce((t, { motor, windings }) => t + windings * bridgeLoss(spec.power.bridge!, windingAmps(spec.power.bridge, motor)), 0);
      if (watts > 0) found = heatFor(spec, watts, `running ${motors.length === 1 ? "its motor" : `${motors.length} motors`}`);
    } else if (pinouts.get(node.id)?.controller) {
      // A board's regulator only works (and warms) when the board is fed through it: a battery on VIN.
      // On USB it is bypassed. It burns the volts it drops times all the board and its 5 V parts draw.
      const feed = powerNets.find((n) => n.feeds?.some((f) => f.node === node.id));
      const out = Math.max(...(spec.power.rails ?? []).map((r) => r.volts), spec.power.logic ?? 5);
      if (feed && feed.voltage! > out) {
        const passed = sum(suppliedBy(node.id).flatMap(loadsOf)).typicalMa + (spec.power.draw?.active ?? 50);
        found = heatFor(spec, ((feed.voltage! - out) * passed) / 1000, `dropping ${feed.voltage} V to ${out} V at ${ma(passed)}`);
      }
    } else if (!sim || sim.kind === "sensor" || sim.kind === "output") {
      found = typicalHeat(spec);
    }
    if (!found) continue;
    heat[node.id] = found;
    if (found.over) {
      const better = spec.upgrade?.[0];
      const isBoard = pinouts.get(node.id)?.controller;
      const advice = isBoard
        ? " Feed it a lower voltage (7 V to 9 V), or power motors, servos and LED strips from their own converter and not from the board's 5 V pin."
        : better
          ? ` ${better.name} does the same job with less loss.`
          : " Lower the load or give it a heatsink.";
      faults.push({
        id: `heat:${node.id}`,
        severity: "warning",
        title: isBoard ? `${nameOf(node.id)}'s regulator overheats` : `${nameOf(node.id)} overheats`,
        detail: `It turns about ${found.watts >= 1 ? `${Math.round(found.watts * 10) / 10} W` : `${Math.round(found.watts * 1000)} mW`} into heat ${found.condition}: around ${Math.round(found.tempC)} °C, past its ${spec.thermal.maxC} °C limit.${advice}`,
        nodes: [node.id],
        wires: [],
      });
    }
  }

  return { rails, draw, heat, faults };
}
