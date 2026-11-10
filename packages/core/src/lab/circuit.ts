/**
 * Circuit analysis for the Engineering Lab.
 *
 * Joins pins into nets through the wires (and through each board's own
 * rails), works out which nets carry a supply, which are ground and which
 * carry signals, then checks every part against what its pins expect. The
 * result drives the Current flow view, the fault list and the simulation.
 */

import { getPart } from "../parts";
import { breadboardSpec, stripName, type RailId } from "../parts/models/breadboard";
import { converterOut } from "../parts/power";
import { getPinout, type LabPin, type PinRole, type Pinout } from "./pinout";
import { ohmsOf } from "./controls";
import { powerBudget, type PowerReport } from "./power";
import type { LabNode, LabWire, NodeInputs, PinRef } from "./types";

export type Severity = "error" | "warning" | "tip";

export interface Fault {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  nodes: string[];
  wires: string[];
}

export type NetKind = "power" | "ground" | "signal" | "short" | "conflict" | "open";

export interface Net {
  id: string;
  pins: PinRef[];
  wires: string[];
  kind: NetKind;
  /** Supply voltage on a power net. */
  voltage?: number;
  /** A readable name: "5V rail", "GND", "D13", "SDA". */
  label: string;
  /** The pin that puts the supply on a power net: a board's rail, a battery's + terminal, a converter's output. */
  source?: PinRef;
  /** Board supply pins on a power net that are being fed from it (a VIN pin on a battery). */
  feeds?: PinRef[];
  /** The net passes through a level shifter, so its two ends may run at different voltages. */
  shifted?: boolean;
}

export type PartStatus = "idle" | "unpowered" | "partial" | "ready" | "fault";

export interface BoardLink {
  /** The board pin a peripheral pin is wired to. */
  board: string;
  boardPin: string;
  pin: string;
  role: PinRole;
}

export interface NodeReport {
  status: PartStatus;
  powered: boolean;
  grounded: boolean;
  supplyV: number | null;
  links: BoardLink[];
  faults: Fault[];
  /** Pins with at least one wire. */
  wiredPins: Set<string>;
  /** Resistance in series with the part's drive and ground (an LED's resistor), in ohms. 0 when there is none. */
  seriesOhms?: number;
  /** For a motor: the driver or switch that runs it. */
  drivenBy?: string;
}

export interface BoardToBoard {
  a: string;
  b: string;
  aPin: string;
  bPin: string;
  bus: "uart" | "i2c" | "spi" | "gpio" | "power";
}

export interface Analysis {
  nets: Net[];
  netOfPin: Map<string, string>;
  netOfWire: Map<string, string>;
  nodes: Record<string, NodeReport>;
  faults: Fault[];
  boardLinks: BoardToBoard[];
  /** What each supply gives and what is drawn from it, and how warm the parts that lose power get. */
  power: PowerReport;
}

export const pinKey = (ref: PinRef) => `${ref.node}:${ref.pin}`;

class DisjointSet {
  private parent = new Map<string, string>();
  add(key: string) {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }
  find(key: string): string {
    let root = this.parent.get(key) ?? key;
    while (root !== (this.parent.get(root) ?? root)) root = this.parent.get(root) ?? root;
    let cur = key;
    while (cur !== root) {
      const next = this.parent.get(cur) ?? root;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function nameOf(node: LabNode) {
  return node.label || getPart(node.partId)?.name || node.partId;
}

const BUS_FN: Partial<Record<PinRole, string>> = { sda: "sda", scl: "scl", mosi: "mosi", miso: "miso", sck: "sck" };
const OPPOSITE: Partial<Record<PinRole, string>> = { sda: "scl", scl: "sda" };

/** A red 5 mm LED's forward voltage, and the series resistor the lab assumes (it has no resistor part). */
export const LED_FORWARD_V = 2;
export const LED_SERIES_OHMS = 220;

/** An LED's current limit; above it the LED (and the pin) is overdriven. */
export const LED_MAX_MA = 20;

/** Current through an LED and `ohms` in series from a pin at `pinV` volts, in mA (220 Ω when no resistor is wired). */
export function ledCurrentMa(pinV: number, ohms: number = LED_SERIES_OHMS): number {
  return (Math.max(0, pinV - LED_FORWARD_V) / Math.max(1, ohms)) * 1000;
}

/** `inputs` carries the values set on parts; a resistor's is its resistance. */
export function analyze(nodes: LabNode[], wires: LabWire[], inputs?: Record<string, NodeInputs>): Analysis {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pinouts = new Map<string, Pinout>(nodes.map((n) => [n.id, getPinout(n.partId)]));
  const set = new DisjointSet();

  // Every pin starts as its own net.
  for (const node of nodes) for (const pin of pinouts.get(node.id)!.pins) set.add(`${node.id}:${pin.id}`);

  // A board's ground pins are one net; so are its pins on the same supply.
  for (const node of nodes) {
    const pinout = pinouts.get(node.id)!;
    if (!pinout.controller) continue;
    const grounds = pinout.pins.filter((p) => p.fns?.includes("ground"));
    for (let i = 1; i < grounds.length; i++) set.union(`${node.id}:${grounds[0].id}`, `${node.id}:${grounds[i].id}`);
    const bySupply = new Map<number, LabPin[]>();
    // A pin that can be fed from outside (VIN) is its own net: with a battery on it, it is not the board's 5 V.
    for (const p of pinout.pins) if (p.supplies && !p.accepts) bySupply.set(p.supplies, [...(bySupply.get(p.supplies) ?? []), p]);
    for (const group of bySupply.values()) for (let i = 1; i < group.length; i++) set.union(`${node.id}:${group[0].id}`, `${node.id}:${group[i].id}`);
  }

  // A breadboard's strips: every hole on one clip is one net.
  for (const node of nodes) {
    for (const strip of pinouts.get(node.id)!.strips ?? []) for (let i = 1; i < strip.length; i++) set.union(`${node.id}:${strip[0]}`, `${node.id}:${strip[i]}`);
  }

  // What each part is to the lab's electrical model, by its `sim`.
  const simOf = (id: string) => getPart(byId.get(id)?.partId ?? "")?.sim;
  const specOf = (id: string) => getPart(byId.get(id)?.partId ?? "")?.spec;
  /** Pins that are the two sides of a level shifter's channel: one signal, two voltages. */
  const shifterPins = new Set<string>();
  for (const node of nodes) {
    const sim = simOf(node.id);
    if (sim?.kind !== "shifter") continue;
    for (const [a, b] of sim.pairs) {
      set.union(`${node.id}:${a}`, `${node.id}:${b}`);
      shifterPins.add(`${node.id}:${a}`).add(`${node.id}:${b}`);
    }
  }

  const validWires: LabWire[] = [];
  for (const wire of wires) {
    const a = pinKey(wire.from);
    const b = pinKey(wire.to);
    if (!byId.has(wire.from.node) || !byId.has(wire.to.node)) continue;
    set.add(a);
    set.add(b);
    set.union(a, b);
    validWires.push(wire);
  }

  // Collect nets.
  const groups = new Map<string, PinRef[]>();
  for (const node of nodes) {
    for (const pin of pinouts.get(node.id)!.pins) {
      const root = set.find(`${node.id}:${pin.id}`);
      groups.set(root, [...(groups.get(root) ?? []), { node: node.id, pin: pin.id }]);
    }
  }
  const wiresOfRoot = new Map<string, string[]>();
  for (const wire of validWires) {
    const root = set.find(pinKey(wire.from));
    wiresOfRoot.set(root, [...(wiresOfRoot.get(root) ?? []), wire.id]);
  }

  const pinOf = (ref: PinRef) => pinouts.get(ref.node)?.pins.find((p) => p.id === ref.pin);
  const isBoard = (id: string) => pinouts.get(id)?.controller ?? false;
  const isPassive = (id: string) => pinouts.get(id)?.passive ?? false;

  let nets: Net[] = [];
  let netOfPin = new Map<string, string>();
  let netOfWire = new Map<string, string>();
  const faults: Fault[] = [];

  /**
   * Supplies that don't come from a board: a battery's + terminal always, a
   * converter's output while its input has a supply. Pin key → volts.
   */
  const live = new Map<string, number>();
  for (const node of nodes) {
    const sim = simOf(node.id);
    const source = specOf(node.id)?.power.source;
    if (sim?.kind === "source" && source) live.set(`${node.id}:${sim.plus}`, source.volts);
  }
  /** Parts whose ground pins make a net ground: batteries and converters. */
  const givesGround = (id: string) => {
    const kind = simOf(id)?.kind;
    return kind === "source" || kind === "converter";
  };

  /** Sorts every net into power, ground, signal and so on, from the supplies that are live. Faults are only recorded on the last pass. */
  const classify = (record: boolean) => {
  nets = [];
  netOfPin = new Map();
  netOfWire = new Map();
  let netIndex = 0;
  for (const [root, members] of groups) {
    const netWires = wiresOfRoot.get(root) ?? [];
    const supplies = new Set<number>();
    let grounded = false;
    let source: PinRef | undefined;
    const boardRails: Array<{ ref: PinRef; pin: LabPin }> = [];
    let outside: { ref: PinRef; volts: number } | undefined;
    for (const ref of members) {
      const pin = pinOf(ref);
      if (!pin) continue;
      if (isBoard(ref.node)) {
        if (pin.supplies) boardRails.push({ ref, pin });
        if (pin.fns?.includes("ground")) grounded = true;
        continue;
      }
      const volts = live.get(pinKey(ref));
      if (volts !== undefined) {
        supplies.add(volts);
        if (!outside || volts > outside.volts) outside = { ref, volts };
      }
      if (pin.fns?.includes("ground") && givesGround(ref.node)) grounded = true;
    }
    // A board pin that can be fed from outside (VIN) is an input when a battery or converter is on its wire.
    const feeds: PinRef[] = [];
    for (const rail of boardRails) {
      if (outside && rail.pin.accepts) feeds.push(rail.ref);
      else {
        supplies.add(rail.pin.supplies!);
        if (!outside) source ??= rail.ref;
      }
    }
    if (outside) source = outside.ref;
    const shifted = members.some((ref) => shifterPins.has(pinKey(ref)));
    let kind: NetKind;
    if (supplies.size && grounded) kind = "short";
    else if (supplies.size > 1) kind = "conflict";
    else if (supplies.size) kind = "power";
    else if (grounded) kind = "ground";
    else kind = netWires.length ? "signal" : "open";
    const voltage = supplies.size ? Math.max(...supplies) : undefined;
    const boardSignal = members.find((ref) => isBoard(ref.node) && !pinOf(ref)?.supplies && !pinOf(ref)?.fns?.includes("ground"));
    const named = members.find((ref) => !isPassive(ref.node)) ?? members[0];
    const first = boardSignal ? pinOf(boardSignal) : pinOf(named);
    const label =
      kind === "power" || kind === "conflict"
        ? `${voltage} V rail`
        : kind === "ground"
          ? "GND"
          : kind === "short"
            ? "Short"
            : (first?.label ?? "net").split(" ")[0];
    const id = `net${netIndex++}`;
    nets.push({ id, pins: members, wires: netWires, kind, voltage, label, ...(kind === "power" && source ? { source } : {}), ...(feeds.length ? { feeds } : {}), ...(shifted ? { shifted } : {}) });
    for (const ref of members) netOfPin.set(pinKey(ref), id);
    for (const w of netWires) netOfWire.set(w, id);
    if (!record) continue;

    // A battery or converter on a board's VIN: inside what the board's regulator takes?
    if (kind === "power" && outside) {
      for (const ref of feeds) {
        const pin = pinOf(ref)!;
        const [min, max] = pin.accepts!;
        const boardName = nameOf(byId.get(ref.node)!);
        const from = nameOf(byId.get(outside.ref.node)!);
        if (outside.volts > max + 0.25) {
          faults.push({ id: `vin-over:${ref.node}:${ref.pin}`, severity: "error", title: `${outside.volts} V is too much for ${pin.label}`, detail: `${boardName} ${pin.label} takes ${min}–${max} V; ${from} gives ${outside.volts} V. The board's regulator would overheat or fail. Put a buck converter between them.`, nodes: [ref.node, outside.ref.node], wires: netWires });
        } else if (outside.volts < min - 0.2) {
          faults.push({ id: `vin-under:${ref.node}:${ref.pin}`, severity: "warning", title: `${outside.volts} V is too little for ${pin.label}`, detail: `${boardName} ${pin.label} needs ${min} V or more for its regulator to give a steady supply; ${from} gives ${outside.volts} V. The board would reset or run erratically. Use a higher battery or feed the 5 V pin from a 5 V converter.`, nodes: [ref.node, outside.ref.node], wires: netWires });
        }
      }
    }

    if (kind === "short" && netWires.length) {
      const boards = [...new Set(members.filter((m) => isBoard(m.node)).map((m) => m.node))];
      faults.push({
        id: `short:${boards.join(",")}:${netWires.slice().sort().join(",")}`,
        severity: "error",
        title: "Short circuit: power wired straight to ground",
        detail: `A ${voltage} V supply and GND are joined. A real board would brown out or burn its regulator, and a battery would overheat. Remove the wire that joins them.`,
        nodes: [...new Set(members.map((m) => m.node))],
        wires: netWires,
      });
    }
    if (kind === "conflict" && netWires.length) {
      faults.push({
        id: `conflict:${netWires.slice().sort().join(",")}`,
        severity: "error",
        title: "Two different supplies joined",
        detail: `${[...supplies].sort().join(" V and ")} V rails are wired together. Each part should take one supply.`,
        nodes: [...new Set(members.map((m) => m.node))],
        wires: netWires,
      });
    }

    // Two parts driving one net.
    const drivers = members.filter((ref) => {
      const pin = pinOf(ref);
      return !isBoard(ref.node) && (pin?.role === "out-digital" || pin?.role === "out-analog");
    });
    if (drivers.length > 1) {
      faults.push({
        id: `contention:${drivers.map(pinKey).sort().join(",")}`,
        severity: "warning",
        title: "Two outputs on one wire",
        detail: `${drivers.map((d) => `${nameOf(byId.get(d.node)!)} ${pinOf(d)?.label}`).join(" and ")} both drive the same net, so the board can't tell their signals apart.`,
        nodes: [...new Set(drivers.map((d) => d.node))],
        wires: netWires,
      });
    }
  }
  };

  // A converter's output is a supply only while its input has one, so settle the nets in passes:
  // batteries first, then each converter they feed, then whatever those feed.
  for (let pass = 0; pass < 5; pass++) {
    classify(false);
    const byNet = new Map(nets.map((n) => [n.id, n]));
    const at = (node: string, pin: string) => byNet.get(netOfPin.get(`${node}:${pin}`) ?? "");
    let changed = false;
    for (const node of nodes) {
      const sim = simOf(node.id);
      const converter = specOf(node.id)?.power.converter;
      if (sim?.kind !== "converter" || !converter) continue;
      const input = at(node.id, sim.input[0]);
      const ground = at(node.id, sim.input[1]);
      const fed = input?.kind === "power" && input.voltage !== undefined && ground?.kind === "ground";
      const set_ = Number(inputs?.[node.id]?.vout);
      const target = Number.isFinite(set_) && set_ > 0 ? set_ : converter.volts;
      const outputs: Array<[string, number]> = fed ? [[sim.output[0], converterOut(converter, input!.voltage!, target)], ...(sim.also ?? []).map((o): [string, number] => [o.pin, Math.min(o.volts, input!.voltage!)])] : [];
      for (const pin of [sim.output[0], ...(sim.also ?? []).map((o) => o.pin)]) {
        const key = `${node.id}:${pin}`;
        const volts = outputs.find((o) => o[0] === pin)?.[1];
        const now = volts !== undefined && volts > 0.05 ? Math.round(volts * 100) / 100 : undefined;
        if (live.get(key) !== now) {
          changed = true;
          if (now === undefined) live.delete(key);
          else live.set(key, now);
        }
      }
    }
    if (!changed) break;
  }
  classify(true);

  const netById = new Map(nets.map((n) => [n.id, n]));
  const netFor = (ref: PinRef) => netById.get(netOfPin.get(pinKey(ref)) ?? "");

  const wiredPins = new Map<string, Set<string>>();
  for (const wire of validWires) {
    for (const end of [wire.from, wire.to]) {
      wiredPins.set(end.node, (wiredPins.get(end.node) ?? new Set()).add(end.pin));
    }
  }

  const reports: Record<string, NodeReport> = {};
  const boardLinks: BoardToBoard[] = [];

  // Boards: powered over USB unless a rail is shorted.
  for (const node of nodes) {
    const pinout = pinouts.get(node.id)!;
    if (!pinout.controller) continue;
    const shorted = nets.some((n) => (n.kind === "short" || n.kind === "conflict") && n.pins.some((p) => p.node === node.id) && n.wires.length > 0);
    reports[node.id] = {
      status: shorted ? "fault" : "ready",
      powered: !shorted,
      grounded: true,
      supplyV: pinout.logic,
      links: [],
      faults: [],
      wiredPins: wiredPins.get(node.id) ?? new Set(),
    };
  }

  // Board-to-board links and their checks.
  for (const net of nets) {
    if (net.kind !== "signal" && net.kind !== "power") continue;
    const boardPins = net.pins.filter((ref) => isBoard(ref.node));
    for (let i = 0; i < boardPins.length; i++) {
      for (let j = i + 1; j < boardPins.length; j++) {
        const a = boardPins[i];
        const b = boardPins[j];
        if (a.node === b.node) continue;
        const pa = pinOf(a)!;
        const pb = pinOf(b)!;
        const fa = pa.fns ?? [];
        const fb = pb.fns ?? [];
        const bus: BoardToBoard["bus"] = net.kind === "power" ? "power" : (fa.includes("tx") || fa.includes("rx")) && (fb.includes("tx") || fb.includes("rx")) ? "uart" : (fa.includes("sda") || fa.includes("scl")) && (fb.includes("sda") || fb.includes("scl")) ? "i2c" : fa.some((f) => ["mosi", "miso", "sck"].includes(f)) && fb.some((f) => ["mosi", "miso", "sck"].includes(f)) ? "spi" : "gpio";
        boardLinks.push({ a: a.node, b: b.node, aPin: a.pin, bPin: b.pin, bus });
        const na = nameOf(byId.get(a.node)!);
        const nb = nameOf(byId.get(b.node)!);
        if (bus === "uart" && ((fa.includes("tx") && fb.includes("tx") && !fb.includes("rx")) || (fa.includes("rx") && fb.includes("rx") && !fb.includes("tx")))) {
          faults.push({
            id: `uart-cross:${pinKey(a)}:${pinKey(b)}`,
            severity: "error",
            title: `${fa.includes("tx") ? "TX wired to TX" : "RX wired to RX"}`,
            detail: `${na} ${pa.label} and ${nb} ${pb.label} are the same direction. Cross them: TX goes to RX.`,
            nodes: [a.node, b.node],
            wires: net.wires,
          });
        }
        const boardA = pinouts.get(a.node)!;
        const boardB = pinouts.get(b.node)!;
        if (net.kind === "signal" && boardA.logic !== boardB.logic && !net.shifted) {
          const high = boardA.logic > boardB.logic ? { ref: a, board: boardA, name: na } : { ref: b, board: boardB, name: nb };
          const low = high.ref === a ? { ref: b, board: boardB, name: nb } : { ref: a, board: boardA, name: na };
          if (low.board.tolerates5V !== true) {
            faults.push({
              id: `level:${pinKey(a)}:${pinKey(b)}`,
              severity: low.board.tolerates5V === "some" ? "warning" : "error",
              title: "5 V signal into a 3.3 V board",
              detail: `${high.name} drives ${high.board.logic} V; ${low.name} pins take 3.3 V. Put a level shifter or a 1 kΩ/2 kΩ divider between them.`,
              nodes: [a.node, b.node],
              wires: net.wires,
            });
          }
        }
        if (net.kind === "power" && boardA !== boardB) {
          // Boards sharing a supply rail is fine; nothing to flag.
        }
      }
    }
  }
  // Boards that talk need a common ground.
  const groundNetOf = (boardId: string) => {
    const pin = pinouts.get(boardId)!.pins.find((p) => p.fns?.includes("ground"));
    return pin ? netOfPin.get(`${boardId}:${pin.id}`) : undefined;
  };
  const checkedPairs = new Set<string>();
  for (const link of boardLinks) {
    if (link.bus === "power") continue;
    const pair = [link.a, link.b].sort().join("|");
    if (checkedPairs.has(pair)) continue;
    checkedPairs.add(pair);
    if (groundNetOf(link.a) !== groundNetOf(link.b)) {
      faults.push({
        id: `common-ground:${pair}`,
        severity: "warning",
        title: "No common ground between boards",
        detail: `${nameOf(byId.get(link.a)!)} and ${nameOf(byId.get(link.b)!)} share a signal but not GND, so neither can read the other's levels reliably. Wire GND to GND.`,
        nodes: [link.a, link.b],
        wires: [],
      });
    }
  }

  // Breadboards: nothing to power or check, but their rails should carry what they're marked with.
  for (const node of nodes) {
    const pinout = pinouts.get(node.id)!;
    if (!pinout.passive) continue;
    const wired = wiredPins.get(node.id) ?? new Set<string>();
    const nodeFaults: Fault[] = [];
    let supplyV: number | null = null;
    let grounded = false;
    const seen = new Set<string>();
    for (const pin of pinout.pins) {
      const net = netFor({ node: node.id, pin: pin.id });
      if (!net || seen.has(net.id)) continue;
      seen.add(net.id);
      if (net.kind === "power" && net.voltage !== undefined) supplyV = Math.max(supplyV ?? 0, net.voltage);
      if (net.kind === "ground") grounded = true;
    }
    const rails = breadboardSpec(node.partId)?.rails ?? {};
    for (const rail of Object.keys(rails) as RailId[]) {
      const net = netFor({ node: node.id, pin: `${rail}1` });
      if (!net || !net.wires.length) continue;
      const { sign, label } = rails[rail]!;
      if (sign === "+" && net.kind === "ground") {
        nodeFaults.push({ id: `rail-sign:${node.id}:${rail}`, severity: "warning", title: `GND on the ${label} rail`, detail: `The ${label} rail is printed red for supply, but it is wired to ground. It works, but anyone who trusts the stripes will wire parts backwards. Put GND on a − rail.`, nodes: [node.id], wires: net.wires });
      } else if (sign === "−" && net.kind === "power") {
        nodeFaults.push({ id: `rail-sign:${node.id}:${rail}`, severity: "warning", title: `${net.voltage} V on the ${label} rail`, detail: `The ${label} rail is printed blue for ground, but it carries ${net.voltage} V. Put the supply on a + rail and GND on this one, so the stripes tell the truth.`, nodes: [node.id], wires: net.wires });
      }
    }
    reports[node.id] = {
      // A breadboard draws no current itself, so it never counts as a load.
      status: wired.size === 0 ? "idle" : "ready",
      powered: false,
      grounded,
      supplyV,
      links: [],
      faults: nodeFaults,
      wiredPins: wired,
    };
    faults.push(...nodeFaults);
  }

  const isResistor = (id: string) => byId.get(id)?.partId === "resistor";
  /**
   * A net that reaches no board pin, supply or ground on its own, followed
   * through one resistor to the net on its other leg: an LED's anode on a
   * resistor whose far leg is on D13 is driven by D13.
   */
  const throughResistor = (net: Net): { net: Net; ohms: number } => {
    const reaches = net.kind === "power" || net.kind === "ground" || net.kind === "short" || net.pins.some((p) => isBoard(p.node));
    if (reaches) return { net, ohms: 0 };
    const leg = net.pins.find((p) => isResistor(p.node));
    if (!leg) return { net, ohms: 0 };
    const other = netFor({ node: leg.node, pin: leg.pin === "1" ? "2" : "1" });
    if (!other || other.id === net.id) return { net, ohms: 0 };
    return { net: other, ohms: ohmsOf(inputs, leg.node) };
  };

  /** Where a net passes through a breadboard: "Top + rail", or null. */
  const breadboardStrip = (net: Net): string | null => {
    const hole = net.pins.find((ref) => !!breadboardSpec(byId.get(ref.node)?.partId ?? ""));
    if (!hole) return null;
    const h = breadboardSpec(byId.get(hole.node)?.partId ?? "")?.holes.find((x) => x.id === hole.pin);
    return h ? stripName(h.strip) : null;
  };

  /** The board an expander (a chip that gives a board more outputs) answers to, once it has been checked. */
  const expanderBoard = new Map<string, string>();
  /** An expander output on a net: its pins act as the board's own outputs. */
  const expanderOn = (net: Net, self: string): PinRef | undefined =>
    net.pins.find((ref) => {
      if (ref.node === self) return false;
      const sim = simOf(ref.node);
      return sim?.kind === "expander" && sim.outputs.includes(ref.pin);
    });
  /** The driver channel whose two outputs sit on these two nets. */
  const channelOn = (a: Net | undefined, b: Net | undefined) => {
    if (!a || !b || a.id === b.id) return null;
    for (const other of nodes) {
      const sim = simOf(other.id);
      if (sim?.kind !== "driver") continue;
      for (const channel of sim.channels) {
        const o1 = netFor({ node: other.id, pin: channel.outputs[0] });
        const o2 = netFor({ node: other.id, pin: channel.outputs[1] });
        if (o1 && o2 && ((o1.id === a.id && o2.id === b.id) || (o1.id === b.id && o2.id === a.id))) return { node: other.id, channel };
      }
    }
    return null;
  };

  // Peripherals: the parts others depend on first (expanders, then drivers), motors last.
  const turn = (id: string) => {
    const kind = simOf(id)?.kind;
    return kind === "expander" ? 0 : kind === "driver" ? 1 : kind === "motor" ? 3 : 2;
  };
  for (const node of [...nodes].sort((a, b) => turn(a.id) - turn(b.id))) {
    const pinout = pinouts.get(node.id)!;
    if (pinout.controller || pinout.passive) continue;
    const name = nameOf(node);
    const nodeFaults: Fault[] = [];
    const links: BoardLink[] = [];
    const wired = wiredPins.get(node.id) ?? new Set<string>();
    const fault = (severity: Severity, key: string, title: string, detail: string, extraNodes: string[] = [], netWires: string[] = []) => {
      nodeFaults.push({ id: `${key}:${node.id}`, severity, title, detail, nodes: [node.id, ...extraNodes], wires: netWires });
    };
    const sim = simOf(node.id);

    // A battery: nothing to power or drive; it is the supply.
    if (sim?.kind === "source") {
      reports[node.id] = { status: wired.size === 0 ? "idle" : "ready", powered: true, grounded: true, supplyV: specOf(node.id)?.power.source?.volts ?? null, links: [], faults: [], wiredPins: wired };
      continue;
    }

    // A motor: it runs from a driver channel, a switch, or straight off a supply. Never from a board pin.
    if (sim?.kind === "motor") {
      const motor = specOf(node.id)?.power.motor;
      const a = netFor({ node: node.id, pin: sim.terminals[0] });
      const b = netFor({ node: node.id, pin: sim.terminals[1] });
      let status: PartStatus = "idle";
      let powered = false;
      let supplyV: number | null = null;
      let drivenBy: string | undefined;
      let motorLinks: BoardLink[] = [];
      if (wired.size > 0) {
        const channel = channelOn(a, b);
        const plainPin = (ref: PinRef) => isBoard(ref.node) && !pinOf(ref)?.supplies && !pinOf(ref)?.fns?.includes("ground");
        const coils = [a, b, ...(sim.second ?? []).map((id) => netFor({ node: node.id, pin: id }))];
        const gpio = coils.flatMap((net) => net?.pins.filter(plainPin) ?? [])[0];
        // A switch in the wire: a relay's contact or a MOSFET module's output on one terminal, a supply or ground on the other.
        const contactOn = (net: Net | undefined) => net?.pins.find((ref) => ref.node !== node.id && pinOf(ref)?.role === "load" && simOf(ref.node)?.kind !== "motor");
        const contact = contactOn(a) ?? contactOn(b);
        const direct = a && b && ((a.kind === "power" && b.kind === "ground") || (b.kind === "power" && a.kind === "ground")) ? (a.kind === "power" ? a : b) : undefined;
        if (channel) {
          const driver = reports[channel.node];
          drivenBy = channel.node;
          motorLinks = (driver?.links ?? []).filter((l) => channel.channel.inputs.includes(l.pin) || l.pin === channel.channel.enable);
          powered = !!driver?.powered;
          supplyV = driver?.supplyV ?? null;
          status = !driver || driver.status === "idle" || driver.status === "unpowered" ? "unpowered" : driver.status === "ready" || (driver.status === "fault" && driver.powered) ? "ready" : "partial";
          if (status === "unpowered") fault("error", "driver-off", "Its driver has no power", `${name} is wired to ${nameOf(byId.get(channel.node)!)}, which has no motor supply yet. Give the driver a battery.`, [channel.node]);
          if (motor && supplyV !== null && supplyV > motor.ratedV * 1.5) fault("warning", "over-volts", `${supplyV} V on a ${motor.ratedV} V motor`, `${name} is rated for ${motor.ratedV} V. On ${supplyV} V it runs hot and wears out fast. Use a lower supply or limit the PWM duty.`, [channel.node]);
          if (sim.second) {
            // A stepper: its other coil goes on another channel of the same driver.
            const other = channelOn(netFor({ node: node.id, pin: sim.second[0] }), netFor({ node: node.id, pin: sim.second[1] }));
            if (!other || other.node !== channel.node || other.channel === channel.channel) {
              if (status === "ready") status = "partial";
              fault("warning", "second-coil", "Only one coil is wired", `${name} has two coils. Wire the second pair of wires to the other channel of ${nameOf(byId.get(channel.node)!)}, or it only buzzes.`, [channel.node]);
            } else motorLinks = [...motorLinks, ...(driver?.links ?? []).filter((l) => (other.channel.inputs.includes(l.pin) || l.pin === other.channel.enable) && !motorLinks.includes(l))];
          }
        } else if (gpio) {
          status = "fault";
          fault(
            "error",
            "pin-drive",
            "A board pin can't run a motor",
            `${name} takes about ${motor?.runMa ?? 150} mA running and ${motor?.stallMa ?? 1000} mA stalled; ${nameOf(byId.get(gpio.node)!)} ${pinOf(gpio)?.label} gives about 20 mA. Put a motor driver or a MOSFET module between them.`,
            [gpio.node],
            coils.flatMap((net) => net?.wires ?? []),
          );
        } else if (contact) {
          const by = reports[contact.node];
          const rail = [a, b].find((net) => net?.kind === "power") ?? pinouts.get(contact.node)!.pins.filter((p) => p.role === "load").map((p) => netFor({ node: contact.node, pin: p.id })).find((net) => net?.kind === "power");
          drivenBy = contact.node;
          motorLinks = (by?.links ?? []).filter((l) => !["vcc", "gnd"].includes(l.role));
          supplyV = rail?.voltage ?? null;
          powered = !!rail;
          status = rail && by && (by.status === "ready" || (by.status === "fault" && by.powered)) ? "ready" : "partial";
          if (!rail) fault("warning", "no-supply", "No supply through its switch yet", `${name} is wired to ${nameOf(byId.get(contact.node)!)}, but no battery or supply reaches it. Wire the supply's + through the switch and its − back to ${name}.`, [contact.node]);
        } else if (direct) {
          powered = true;
          supplyV = direct.voltage ?? null;
          status = "ready";
          fault("tip", "always-on", "Runs whenever the supply is on", `${name} is wired straight across the ${direct.voltage} V supply, so nothing can switch it or set its speed. Put a motor driver or a MOSFET module between them.`);
        } else {
          status = "partial";
          fault("warning", "no-driver", "Not wired to a driver yet", `Wire ${name}'s ${sim.second ? "two coils to the two channels" : "two terminals to one channel"} of a motor driver (its OUT pins)${sim.second ? "" : ", or switch it with a MOSFET module"}.`);
        }
      }
      reports[node.id] = { status, powered, grounded: true, supplyV, links: motorLinks, faults: nodeFaults, wiredPins: wired, drivenBy };
      faults.push(...nodeFaults);
      continue;
    }

    let supplyV: number | null = null;
    let poweredByRail = false;
    let grounded = false;
    /** The voltage found on each supply pin. A driver has two: its logic's and its motors'. */
    const supplied = new Map<string, number>();
    const motorSupply = sim?.kind === "driver" ? sim.supply : undefined;
    const vccPins = pinout.pins.filter((p) => p.role === "vcc");
    /** Supply pins that must be fed: all the required ones, or the first when none says so. */
    const neededVcc = vccPins.some((p) => p.required !== false) ? vccPins.filter((p) => p.required !== false) : vccPins.slice(0, 1);
    const hasVcc = vccPins.length > 0;
    const hasGnd = pinout.pins.some((p) => p.role === "gnd");
    let driven = false;
    /** The voltage on the part's drive pin when it is on: a rail's, or the board's logic level. */
    let driveV: number | null = null;

    /** Resistance met on the way to the drive pin and to ground. */
    let seriesOhms = 0;

    // Supply first: a part's output level depends on what powers it.
    const ordered = [...pinout.pins].sort((a, b) => (a.role === "vcc" ? 0 : 1) - (b.role === "vcc" ? 0 : 1));
    let settled = false;
    /** Once every supply pin has been looked at: is the part powered, and what do its signals swing to? */
    const settle = () => {
      settled = true;
      poweredByRail = hasVcc && neededVcc.every((p) => supplied.has(p.id));
      const logicPin = vccPins.find((p) => p.id !== motorSupply && supplied.has(p.id)) ?? vccPins.find((p) => supplied.has(p.id));
      supplyV = logicPin ? supplied.get(logicPin.id)! : null;
    };
    for (const pin of ordered) {
      if (pin.role !== "vcc" && !settled) settle();
      const ref = { node: node.id, pin: pin.id };
      const direct = netFor(ref);
      if (!direct) continue;
      // A supply is never taken through a resistor; everything else may be.
      const hop = pin.role === "vcc" ? { net: direct, ohms: 0 } : throughResistor(direct);
      const net = hop.net;
      if (hop.ohms && (pin.role === "drive" || pin.role === "pwm" || pin.role === "gnd")) seriesOhms += hop.ohms;
      const boardRefs = net.pins.filter((r) => isBoard(r.node) && !pinOf(r)?.supplies && !pinOf(r)?.fns?.includes("ground"));
      const boardRef = boardRefs[0];
      const boardPin = boardRef ? pinOf(boardRef) : undefined;
      const board = boardRef ? pinouts.get(boardRef.node) : undefined;
      const boardName = boardRef ? nameOf(byId.get(boardRef.node)!) : "";
      const isWired = wired.has(pin.id);
      if (boardRef && boardPin) links.push({ board: boardRef.node, boardPin: boardPin.id, pin: pin.id, role: pin.role ?? "opt" });

      switch (pin.role) {
        case "vcc": {
          if (net.kind === "power" && net.voltage !== undefined) {
            supplied.set(pin.id, net.voltage);
            // A pin with its own range (a driver's motor supply) is checked against that; the rest against the part's.
            const [min, max] = pin.accepts ?? pinout.supply ?? [0, 99];
            const own = !!pin.accepts && vccPins.length > 1;
            if (net.voltage > max + 0.25) {
              fault("error", `over:${pin.id}`, own ? `${net.voltage} V on a ${max} V pin` : `${net.voltage} V on a ${max} V part`, `${name}${own ? ` ${pin.label}` : ""} takes ${min}–${max} V but ${own ? "it" : pin.label} is on the ${net.voltage} V rail. It would be damaged. Move it to ${max < 4 ? "3.3 V" : `a supply of ${max} V or less`}.`, [], net.wires);
            } else if (net.voltage < min - 0.2) {
              fault("warning", `under:${pin.id}`, `Underpowered at ${net.voltage} V`, `${name}${own ? ` ${pin.label}` : ""} needs ${min}–${max} V; on ${net.voltage} V it may not run or will read wrong. ${min > 5.5 ? `Give it a battery or supply of ${min} V or more.` : "Use the 5 V pin."}`, [], net.wires);
            }
          } else if (net.kind === "signal" && boardRef && board) {
            supplied.set(pin.id, board.logic);
            fault("warning", `gpio-power:${pin.id}`, `Powered from a GPIO pin`, `${pin.label} is on ${boardName} ${boardPin?.label}. A GPIO pin gives about 20 mA; wire ${pin.label} to a power pin.`, [boardRef.node], net.wires);
          } else if (net.kind === "ground") {
            fault("error", `vcc-gnd:${pin.id}`, `${pin.label} is wired to ground`, `${name} gets no supply this way. Move ${pin.label} to a ${pinout.supply && pinout.supply[1] < 4 ? "3.3 V" : "5 V"} pin.`, [], net.wires);
          }
          break;
        }
        case "gnd": {
          if (net.kind === "ground") grounded = true;
          else if (net.kind === "power") fault("error", `gnd-vcc:${pin.id}`, `${pin.label} is on a supply rail`, `Ground pins go to GND. With ${pin.label} on ${net.voltage} V, ${name} has no return path.`, [], net.wires);
          break;
        }
        case "drive":
        case "pwm":
        case "cs": {
          const expander = expanderOn(net, node.id);
          if (expander) {
            // An output of an I/O expander: as good as a pin of the board it answers to.
            driven = true;
            driveV ??= pinouts.get(expander.node)?.logic ?? null;
            links.push({ board: expanderBoard.get(expander.node) ?? expander.node, boardPin: expander.pin, pin: pin.id, role: pin.role });
            break;
          }
          if (net.kind === "power") {
            driven = true;
            driveV ??= net.voltage ?? null;
            if (pin.role === "drive" && isWired) fault("tip", `always-on:${pin.id}`, `${pin.label} is always on`, `${pin.label} sits on the ${net.voltage} V rail, so ${name} is on all the time and the board can't switch it.`, [], net.wires);
          } else if (net.kind === "ground") {
            if (isWired) fault("warning", `held-low:${pin.id}`, `${pin.label} is held at ground`, `${name} never switches on with ${pin.label} on GND. Wire it to an output pin.`, [], net.wires);
          } else if (boardRef && boardPin && board) {
            if (boardPin.inputOnly) {
              fault("error", `input-only:${pin.id}`, `${boardPin.label} can't drive outputs`, `${boardName} ${boardPin.label} is input-only. Move ${pin.label} to an output-capable pin.`, [boardRef.node], net.wires);
            } else {
              driven = true;
              driveV ??= board.logic;
              if (pin.role === "pwm" && !boardPin.fns?.includes("pwm")) {
                fault("warning", `no-pwm:${pin.id}`, `${boardPin.label} has no PWM`, `${name} ${pin.label} needs PWM for ${node.partId === "servo" ? "angles" : "dimming and speed"}; ${boardPin.label} can only switch fully on or off. Use a ~ pin.`, [boardRef.node], net.wires);
              }
              if (board.logic >= 5 && pinout.tolerates5V === false && !net.shifted) {
                fault("error", `level-in:${pin.id}`, `5 V signal into a 3.3 V input`, `${boardName} drives 5 V into ${name} ${pin.label}, which takes 3.3 V. Add a divider or level shifter.`, [boardRef.node], net.wires);
              }
            }
          } else if (pin.required && wired.size > 0) {
            fault("error", `unwired:${pin.id}`, `${pin.label} isn't connected`, `Wire ${name} ${pin.label} to an output pin on a board.`);
          }
          break;
        }
        case "out-digital":
        case "out-analog":
        case "io":
        case "sda":
        case "scl":
        case "tx":
        case "rx":
        case "mosi":
        case "miso":
        case "sck": {
          if (boardRef && boardPin && board) {
            const role = pin.role;
            const fns = boardPin.fns ?? [];
            if (role === "out-analog" && !fns.includes("analog")) {
              const any = board.pins.some((p) => p.fns?.includes("analog"));
              fault(
                "warning",
                `not-analog:${pin.id}`,
                any ? `${boardPin.label} can't read analog` : `${boardName} has no analog inputs`,
                any ? `${name} ${pin.label} is an analog voltage; ${boardPin.label} only reads HIGH or LOW. Use an analog pin.` : `${boardName} reads only digital levels. Add an ADC such as the ADS1115 to read ${name}.`,
                [boardRef.node],
                net.wires,
              );
            }
            const busFn = BUS_FN[role];
            if (busFn && !fns.includes(busFn as never)) {
              const opposite = OPPOSITE[role];
              if (opposite && fns.includes(opposite as never)) {
                fault("error", `swapped:${pin.id}`, `SDA and SCL swapped`, `${name} ${pin.label} is on ${boardName} ${boardPin.label}. Swap the two I²C wires.`, [boardRef.node], net.wires);
              } else {
                fault("warning", `bus-pin:${pin.id}`, `${pin.label} isn't on the ${role.toUpperCase()} pin`, `${boardName} ${boardPin.label} isn't its hardware ${role.toUpperCase()} pin, so the default library won't find ${name}.`, [boardRef.node], net.wires);
              }
            }
            if (role === "tx" && !fns.includes("rx")) {
              fault(fns.includes("tx") ? "error" : "tip", `uart:${pin.id}`, fns.includes("tx") ? "TX wired to TX" : "Not a hardware serial pin", fns.includes("tx") ? `${name} TX must go to ${boardName} RX: transmit meets receive.` : `${boardPin.label} works with SoftwareSerial; the hardware RX pin is faster.`, [boardRef.node], net.wires);
            }
            if (role === "rx" && !fns.includes("tx")) {
              fault(fns.includes("rx") ? "error" : "tip", `uart:${pin.id}`, fns.includes("rx") ? "RX wired to RX" : "Not a hardware serial pin", fns.includes("rx") ? `${name} RX must come from ${boardName} TX.` : `${boardPin.label} works with SoftwareSerial; the hardware TX pin is faster.`, [boardRef.node], net.wires);
            }
            if (role === "rx" && board.logic >= 5 && pinout.tolerates5V === false && !net.shifted) {
              fault("warning", `level-rx:${pin.id}`, `5 V TX into a 3.3 V RX`, `${boardName} sends 5 V into ${name} ${pin.label}. Put a 1 kΩ/2 kΩ divider on that wire.`, [boardRef.node], net.wires);
            }
            // The part's own output level against what the board accepts.
            if (["out-digital", "out-analog", "io", "sda", "scl", "tx", "miso"].includes(role)) {
              const outV = Math.min(pinout.logic, supplyV ?? pinout.logic);
              if (outV > 3.6 && board.tolerates5V !== true && !net.shifted) {
                fault(board.tolerates5V === "some" ? "warning" : "error", `level-out:${pin.id}`, `5 V output into a 3.3 V pin`, `${name} ${pin.label} swings to ${outV} V; ${boardName} pins take 3.3 V. Add a 1 kΩ/2 kΩ divider.`, [boardRef.node], net.wires);
              }
            }
            if (boardPin.inputOnly && (role === "io" || role === "sda" || role === "scl" || role === "tx" || role === "mosi" || role === "sck")) {
              fault("error", `input-only:${pin.id}`, `${boardPin.label} is input-only`, `${name} ${pin.label} needs the board to drive it. Move it to a normal GPIO.`, [boardRef.node], net.wires);
            }
          } else if (net.kind === "power" || net.kind === "ground") {
            if (isWired) fault("warning", `rail-signal:${pin.id}`, `${pin.label} is on a ${net.kind === "power" ? "supply" : "ground"} pin`, `${pin.label} carries a signal and should go to a GPIO pin.`, [], net.wires);
          } else if (pin.required && wired.size > 0) {
            fault("error", `unwired:${pin.id}`, `${pin.label} isn't connected`, `Wire ${name} ${pin.label} to ${pin.role === "out-analog" ? "an analog pin" : "a GPIO pin"} on a board.`);
          }
          break;
        }
        default:
          break;
      }
    }

    if (!settled) settle();
    // What a driver reports is its motor supply: that is what its motors get.
    if (motorSupply) supplyV = supplied.get(motorSupply) ?? null;

    // A part on its own supply (a servo on a battery) still needs the board's ground, or its signals mean nothing.
    const ownGround = pinout.pins.find((p) => p.role === "gnd");
    const ownGroundNet = ownGround ? netFor({ node: node.id, pin: ownGround.id }) : undefined;
    if (ownGroundNet?.kind === "ground") {
      for (const boardId of new Set(links.filter((l) => !["vcc", "gnd"].includes(l.role) && isBoard(l.board)).map((l) => l.board))) {
        const boardGround = groundNetOf(boardId);
        if (boardGround && boardGround !== ownGroundNet.id) {
          fault("warning", `common-ground:${boardId}`, "No common ground with the board", `${name} takes its ground from a different supply than ${nameOf(byId.get(boardId)!)}. Join the two grounds with a wire, or the board's signals mean nothing to it.`, [boardId]);
        }
      }
    }
    if (sim?.kind === "expander") {
      const board = links.find((l) => !["vcc", "gnd"].includes(l.role) && isBoard(l.board))?.board;
      if (board) expanderBoard.set(node.id, board);
    }

    // "Any of" groups: at least one signal pin must be used.
    const optionalSignals = pinout.pins.filter((p) => !p.required && p.role && !["opt", "load", "vcc", "gnd"].includes(p.role));
    const requiredSignals = pinout.pins.filter((p) => p.required && p.role && !["vcc", "gnd"].includes(p.role));
    if (!requiredSignals.length && optionalSignals.length && wired.size > 0 && !optionalSignals.some((p) => links.some((l) => l.pin === p.id))) {
      fault("error", "no-signal", `No signal pin connected`, `Wire one of ${optionalSignals.map((p) => p.label).join(", ")} to a board pin.`);
    }

    // A part with a supply pin is powered by it; one the board drives (an LED) by its pin; and a bare
    // switch with neither is live once it has its ground and a board pin to pull.
    const hasDrive = pinout.pins.some((p) => p.role === "drive" || p.role === "pwm");
    const powered = hasVcc ? poweredByRail : hasDrive ? driven : grounded && links.some((l) => l.role !== "gnd");
    if (wired.size > 0) {
      if (hasVcc && !poweredByRail && !nodeFaults.some((f) => f.id.startsWith("vcc-gnd"))) {
        const vcc = neededVcc.find((p) => !supplied.has(p.id)) ?? vccPins[0];
        const range = vcc.accepts ?? pinout.supply;
        const want = !range ? "3.3 V or 5 V" : range[1] < 4 ? "3.3 V" : range[0] > 5.5 ? `a ${range[0]}–${range[1]} V battery or supply` : range[0] > 3.6 ? "5 V" : "3.3 V or 5 V";
        const vccNet = netFor({ node: node.id, pin: vcc.id });
        const strip = vccNet ? breadboardStrip(vccNet) : null;
        const some = supplied.size > 0;
        fault("error", "no-power", some ? `${vcc.label} has no power` : "No power", strip ? `${name} ${vcc.label} is on the breadboard's ${strip}, which has no supply yet. Wire a board's ${want} pin to it.` : `${name} ${vcc.label} isn't on a supply. Wire it to ${want}.`);
      }
      if (hasGnd && !grounded && !nodeFaults.some((f) => f.id.startsWith("gnd-vcc"))) {
        const g = pinout.pins.find((p) => p.role === "gnd")!;
        const gNet = netFor({ node: node.id, pin: g.id });
        const strip = gNet ? breadboardStrip(gNet) : null;
        fault("error", "no-ground", "No path to ground", strip ? `${name} ${g.label} is on the breadboard's ${strip}, which isn't wired to GND. Wire a board's GND pin to it.` : `${name} ${g.label} isn't on GND, so no current can flow through it. Wire it to a GND pin.`);
      }
      if (node.partId === "led" && driven && grounded) {
        const v = driveV ?? 5;
        if (seriesOhms > 0) {
          // A real resistor: the current follows from its value.
          const ma = ledCurrentMa(v, seriesOhms);
          if (ma > LED_MAX_MA) {
            const min = Math.ceil(((v - LED_FORWARD_V) / LED_MAX_MA) * 1000);
            fault("warning", "too-much-current", `${ma.toFixed(0)} mA: more than the LED takes`, `With ${seriesOhms} Ω from a ${v} V pin, about ${ma.toFixed(1)} mA flows; an LED takes about ${LED_MAX_MA} mA. Use at least ${min} Ω (220 Ω is the usual choice).`);
          }
        } else {
          // No resistor part wired: the model assumes the 220 Ω a real build needs; the LED's
          // Live panel shows the same current (ledCurrentMa). Advisory, not a fault.
          const ma = ledCurrentMa(v).toFixed(1);
          fault(
            "tip",
            "resistor",
            "Assumed: 220 Ω resistor in series",
            `No resistor is wired, so the lab models this LED as if a 220 Ω resistor sat between the ${v} V pin and the anode: about ${ma} mA when on. Add a Resistor part between the pin and the anode; on a real board an LED wired straight to a pin draws too much current and can damage the LED and the pin.`,
          );
        }
      }
    }

    const errors = nodeFaults.filter((f) => f.severity === "error");
    const signalsOk = pinout.pins.filter((p) => p.required && p.role && !["vcc", "gnd"].includes(p.role)).every((p) => links.some((l) => l.pin === p.id) || (p.role === "drive" && driven) || (p.role === "vcc" && poweredByRail));
    let status: PartStatus;
    if (wired.size === 0) status = "idle";
    else if (errors.length) status = "fault";
    else if (powered && (grounded || !hasGnd) && signalsOk) status = "ready";
    else if (powered) status = "partial";
    else status = "unpowered";

    // A level shifter has no supply pin the checks know: it is ready once its ground is.
    if (sim?.kind === "shifter" && wired.size > 0 && !errors.length) status = grounded ? "ready" : "partial";

    reports[node.id] = { status, powered: sim?.kind === "shifter" ? grounded : powered && (grounded || !hasGnd), grounded, supplyV, links, faults: nodeFaults, wiredPins: wired, seriesOhms };
    faults.push(...nodeFaults);
  }

  // What every supply is asked for against what it can give, and what gets hot.
  const power = powerBudget({ nodes, nets, netOfPin, reports, pinouts, inputs });
  faults.push(...power.faults);

  // Attach net-level faults to the nodes they touch.
  for (const f of faults) {
    for (const id of f.nodes) {
      const report = reports[id];
      if (report && !report.faults.includes(f)) {
        report.faults.push(f);
        if (f.severity === "error") report.status = "fault";
      }
    }
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, tip: 2 };
  faults.sort((a, b) => order[a.severity] - order[b.severity]);
  return { nets, netOfPin, netOfWire, nodes: reports, faults, boardLinks, power };
}
