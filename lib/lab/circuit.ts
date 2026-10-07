/**
 * Circuit analysis for the Engineering Lab.
 *
 * Joins pins into nets through the wires (and through each board's own
 * rails), works out which nets carry a supply, which are ground and which
 * carry signals, then checks every part against what its pins expect. The
 * result drives the Current flow view, the fault list and the simulation.
 */

import { getPart } from "@/lib/parts";
import { getPinout, type LabPin, type PinRole, type Pinout } from "./pinout";
import type { LabNode, LabWire, PinRef } from "./types";

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

export function analyze(nodes: LabNode[], wires: LabWire[]): Analysis {
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
    for (const p of pinout.pins) if (p.supplies) bySupply.set(p.supplies, [...(bySupply.get(p.supplies) ?? []), p]);
    for (const group of bySupply.values()) for (let i = 1; i < group.length; i++) set.union(`${node.id}:${group[0].id}`, `${node.id}:${group[i].id}`);
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

  const nets: Net[] = [];
  const netOfPin = new Map<string, string>();
  const netOfWire = new Map<string, string>();
  const faults: Fault[] = [];

  let netIndex = 0;
  for (const [root, members] of groups) {
    const netWires = wiresOfRoot.get(root) ?? [];
    const supplies = new Set<number>();
    let grounded = false;
    for (const ref of members) {
      const pin = pinOf(ref);
      if (!pin || !isBoard(ref.node)) continue;
      if (pin.supplies) supplies.add(pin.supplies);
      if (pin.fns?.includes("ground")) grounded = true;
    }
    let kind: NetKind;
    if (supplies.size && grounded) kind = "short";
    else if (supplies.size > 1) kind = "conflict";
    else if (supplies.size) kind = "power";
    else if (grounded) kind = "ground";
    else kind = netWires.length ? "signal" : "open";
    const voltage = supplies.size ? Math.max(...supplies) : undefined;
    const boardSignal = members.find((ref) => isBoard(ref.node) && !pinOf(ref)?.supplies && !pinOf(ref)?.fns?.includes("ground"));
    const first = boardSignal ? pinOf(boardSignal) : pinOf(members[0]);
    const label =
      kind === "power" || kind === "conflict"
        ? `${voltage} V rail`
        : kind === "ground"
          ? "GND"
          : kind === "short"
            ? "Short"
            : (first?.label ?? "net").split(" ")[0];
    const id = `net${netIndex++}`;
    nets.push({ id, pins: members, wires: netWires, kind, voltage, label });
    for (const ref of members) netOfPin.set(pinKey(ref), id);
    for (const w of netWires) netOfWire.set(w, id);

    if (kind === "short" && netWires.length) {
      const boards = [...new Set(members.filter((m) => isBoard(m.node)).map((m) => m.node))];
      faults.push({
        id: `short:${boards.join(",")}:${netWires.slice().sort().join(",")}`,
        severity: "error",
        title: "Short circuit: power wired straight to ground",
        detail: `A ${voltage} V supply and GND are joined. A real board would brown out or burn its regulator. Remove the wire that joins them.`,
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
        if (net.kind === "signal" && boardA.logic !== boardB.logic) {
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

  // Peripherals.
  for (const node of nodes) {
    const pinout = pinouts.get(node.id)!;
    if (pinout.controller) continue;
    const name = nameOf(node);
    const nodeFaults: Fault[] = [];
    const links: BoardLink[] = [];
    const wired = wiredPins.get(node.id) ?? new Set<string>();
    const fault = (severity: Severity, key: string, title: string, detail: string, extraNodes: string[] = [], netWires: string[] = []) => {
      nodeFaults.push({ id: `${key}:${node.id}`, severity, title, detail, nodes: [node.id, ...extraNodes], wires: netWires });
    };

    let supplyV: number | null = null;
    let poweredByRail = false;
    let grounded = false;
    const hasVcc = pinout.pins.some((p) => p.role === "vcc");
    const hasGnd = pinout.pins.some((p) => p.role === "gnd");
    let driven = false;

    // Supply first: a part's output level depends on what powers it.
    const ordered = [...pinout.pins].sort((a, b) => (a.role === "vcc" ? 0 : 1) - (b.role === "vcc" ? 0 : 1));
    for (const pin of ordered) {
      const ref = { node: node.id, pin: pin.id };
      const net = netFor(ref);
      if (!net) continue;
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
            supplyV = net.voltage;
            poweredByRail = true;
            const [min, max] = pinout.supply ?? [0, 99];
            if (net.voltage > max + 0.25) {
              fault("error", `over:${pin.id}`, `${net.voltage} V on a ${max} V part`, `${name} takes ${min}–${max} V but ${pin.label} is on the ${net.voltage} V rail. It would be damaged. Move it to 3.3 V.`, [], net.wires);
            } else if (net.voltage < min - 0.2) {
              fault("warning", `under:${pin.id}`, `Underpowered at ${net.voltage} V`, `${name} needs ${min}–${max} V; on ${net.voltage} V it may not run or will read wrong. Use the 5 V pin.`, [], net.wires);
            }
          } else if (net.kind === "signal" && boardRef && board) {
            supplyV = board.logic;
            poweredByRail = true;
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
          if (net.kind === "power") {
            driven = true;
            if (pin.role === "drive" && isWired) fault("tip", `always-on:${pin.id}`, `${pin.label} is always on`, `${pin.label} sits on the ${net.voltage} V rail, so ${name} is on all the time and the board can't switch it.`, [], net.wires);
          } else if (net.kind === "ground") {
            if (isWired) fault("warning", `held-low:${pin.id}`, `${pin.label} is held at ground`, `${name} never switches on with ${pin.label} on GND. Wire it to an output pin.`, [], net.wires);
          } else if (boardRef && boardPin && board) {
            if (boardPin.inputOnly) {
              fault("error", `input-only:${pin.id}`, `${boardPin.label} can't drive outputs`, `${boardName} ${boardPin.label} is input-only. Move ${pin.label} to an output-capable pin.`, [boardRef.node], net.wires);
            } else {
              driven = true;
              if (pin.role === "pwm" && !boardPin.fns?.includes("pwm")) {
                fault("warning", `no-pwm:${pin.id}`, `${boardPin.label} has no PWM`, `${name} ${pin.label} needs PWM for ${node.partId === "servo" ? "angles" : "dimming and speed"}; ${boardPin.label} can only switch fully on or off. Use a ~ pin.`, [boardRef.node], net.wires);
              }
              if (board.logic >= 5 && pinout.tolerates5V === false) {
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
            if (role === "rx" && board.logic >= 5 && pinout.tolerates5V === false) {
              fault("warning", `level-rx:${pin.id}`, `5 V TX into a 3.3 V RX`, `${boardName} sends 5 V into ${name} ${pin.label}. Put a 1 kΩ/2 kΩ divider on that wire.`, [boardRef.node], net.wires);
            }
            // The part's own output level against what the board accepts.
            if (["out-digital", "out-analog", "io", "sda", "scl", "tx", "miso"].includes(role)) {
              const outV = Math.min(pinout.logic, supplyV ?? pinout.logic);
              if (outV > 3.6 && board.tolerates5V !== true) {
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

    // "Any of" groups: at least one signal pin must be used.
    const optionalSignals = pinout.pins.filter((p) => !p.required && p.role && !["opt", "load", "vcc", "gnd"].includes(p.role));
    const requiredSignals = pinout.pins.filter((p) => p.required && p.role && !["vcc", "gnd"].includes(p.role));
    if (!requiredSignals.length && optionalSignals.length && wired.size > 0 && !optionalSignals.some((p) => links.some((l) => l.pin === p.id))) {
      fault("error", "no-signal", `No signal pin connected`, `Wire one of ${optionalSignals.map((p) => p.label).join(", ")} to a board pin.`);
    }

    const powered = hasVcc ? poweredByRail : driven;
    if (wired.size > 0) {
      if (hasVcc && !poweredByRail && !nodeFaults.some((f) => f.id.startsWith("vcc-gnd"))) {
        const vcc = pinout.pins.find((p) => p.role === "vcc")!;
        fault("error", "no-power", "No power", `${name} ${vcc.label} isn't on a supply. Wire it to ${pinout.supply && pinout.supply[1] < 4 ? "3.3 V" : pinout.supply && pinout.supply[0] > 3.6 ? "5 V" : "3.3 V or 5 V"}.`);
      }
      if (hasGnd && !grounded && !nodeFaults.some((f) => f.id.startsWith("gnd-vcc"))) {
        const g = pinout.pins.find((p) => p.role === "gnd")!;
        fault("error", "no-ground", "No path to ground", `${name} ${g.label} isn't on GND, so no current can flow through it. Wire it to a GND pin.`);
      }
      if (node.partId === "led" && driven && grounded) {
        fault("tip", "resistor", "Add a 220 Ω resistor in a real build", "An LED straight on a pin draws too much current. The simulation assumes a 220 Ω resistor in series.");
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

    reports[node.id] = { status, powered: powered && (grounded || !hasGnd), grounded, supplyV, links, faults: nodeFaults, wiredPins: wired };
    faults.push(...nodeFaults);
  }

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
  return { nets, netOfPin, netOfWire, nodes: reports, faults, boardLinks };
}
