/**
 * Auto-wiring and placement: what the lab does when a part is added with one
 * click. A peripheral is wired to the board the way a tutorial would: supply,
 * ground, and each signal on a free pin that can do the job.
 */

import { nodeLayout } from "./layout";
import { getPinout, type LabPin, type PinFn, type Pinout } from "./pinout";
import type { LabNode, LabWire, PinRef } from "./types";

export interface PlannedWire {
  from: PinRef;
  to: PinRef;
}

/** Board pins already carrying a wire. Power and ground can be shared. */
function usedPins(boardId: string, wires: LabWire[]): Set<string> {
  const used = new Set<string>();
  for (const w of wires) {
    if (w.from.node === boardId) used.add(w.from.pin);
    if (w.to.node === boardId) used.add(w.to.pin);
  }
  return used;
}

const SHARED_BUS: PinFn[] = ["sda", "scl", "mosi", "miso", "sck"];

function pickBoard(nodes: LabNode[], wires: LabWire[], prefer?: string): LabNode | null {
  const boards = nodes.filter((n) => getPinout(n.partId).controller);
  if (!boards.length) return null;
  if (prefer) {
    const chosen = boards.find((b) => b.id === prefer);
    if (chosen) return chosen;
  }
  // The board with most free signal pins.
  return [...boards].sort((a, b) => {
    const free = (n: LabNode) => getPinout(n.partId).pins.filter((p) => !p.supplies && !p.fns?.includes("ground") && !usedPins(n.id, wires).has(p.id)).length;
    return free(b) - free(a);
  })[0];
}

export function planAutoWire(part: LabNode, nodes: LabNode[], wires: LabWire[], preferBoard?: string): { board: LabNode | null; wires: PlannedWire[]; skipped: string[] } {
  const pinout = getPinout(part.partId);
  if (pinout.controller) return { board: null, wires: [], skipped: [] };
  const board = pickBoard(nodes.filter((n) => n.id !== part.id), wires, preferBoard);
  if (!board) return { board: null, wires: [], skipped: [] };
  const bp: Pinout = getPinout(board.partId);
  const used = usedPins(board.id, wires);
  const taken = new Set<string>();
  const planned: PlannedWire[] = [];
  const skipped: string[] = [];

  const facing = part.x >= board.x ? "right" : "left";
  const plain = (p: LabPin) => !p.supplies && !p.fns?.includes("ground");
  const free = (p: LabPin) => plain(p) && !used.has(p.id) && !taken.has(p.id);
  const hasBus = (p: LabPin) => (p.fns ?? []).some((f) => ["sda", "scl", "tx", "rx", "mosi", "miso", "sck", "cs"].includes(f));
  // Pins on the side facing the part first, so wires don't wrap round the board.
  const choose = (cands: LabPin[]) => [...cands].sort((a, b) => Number(b.side === facing) - Number(a.side === facing))[0];

  const supplyPin = (): LabPin | undefined => {
    const [min, max] = pinout.supply ?? [3, 5.5];
    // Rails on the side facing the part first, so wires don't wrap round the board.
    const rails = bp.pins.filter((p) => p.supplies).sort((a, b) => Number(b.side === facing) - Number(a.side === facing));
    const fits = rails.filter((p) => p.supplies! >= min - 0.2 && p.supplies! <= max + 0.25);
    const preferV = fits.some((p) => p.supplies === bp.logic) ? bp.logic : undefined;
    return (preferV ? fits.find((p) => p.supplies === preferV && p.id !== "VIN") : undefined) ?? fits.find((p) => p.id !== "VIN") ?? fits[0] ?? rails.find((p) => p.supplies === Math.min(...rails.map((r) => r.supplies!)));
  };
  const groundPin = (): LabPin | undefined => {
    const grounds = bp.pins.filter((p) => p.fns?.includes("ground"));
    const count = (id: string) => wires.filter((w) => (w.from.node === board.id && w.from.pin === id) || (w.to.node === board.id && w.to.pin === id)).length;
    // Prefer the ground on the side facing the part, then the least used.
    return [...grounds].sort((a, b) => Number(b.side === facing) - Number(a.side === facing) || count(a.id) - count(b.id))[0];
  };

  const signalOrder = pinout.pins.filter((p) => p.role && !["opt", "load"].includes(p.role));
  // Of "any of" groups (soil A0/D0, RGB, motor IN/EN) wire the useful ones.
  const wanted = signalOrder.filter((p) => {
    if (p.required) return true;
    if (part.partId === "soil-moisture" || part.partId === "mq2") return p.id === "A0";
    if (part.partId === "rgb-led" || part.partId === "dc-motor") return true;
    return false;
  });

  for (const pin of wanted) {
    let target: LabPin | undefined;
    switch (pin.role) {
      case "vcc":
        target = supplyPin();
        break;
      case "gnd":
        target = groundPin();
        break;
      case "drive":
        target =
          (part.partId === "led" ? bp.pins.find((p) => p.fns?.includes("led") && free(p) && !p.inputOnly) : undefined) ??
          choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("digital") && !hasBus(p) && !p.fns?.includes("analog"))) ??
          choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("digital") && !hasBus(p))) ??
          choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("digital")));
        break;
      case "pwm":
        target = choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("pwm") && !hasBus(p))) ?? choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("pwm"))) ?? choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("digital")));
        break;
      case "out-analog":
        target =
          choose(bp.pins.filter((p) => free(p) && p.fns?.includes("analog") && !hasBus(p))) ??
          choose(bp.pins.filter((p) => free(p) && p.fns?.includes("analog"))) ??
          // No analog pins (Raspberry Pi): land on a GPIO; the analysis explains the ADC it needs.
          choose(bp.pins.filter((p) => free(p) && p.fns?.includes("digital") && !hasBus(p)));
        break;
      case "out-digital":
      case "io": {
        // Input-only pins suit a part's output but not two-way data; try them last either way.
        const ok = (p: LabPin) => free(p) && p.fns?.includes("digital") && (pin.role === "out-digital" || !p.inputOnly);
        const byInputOnly = (list: LabPin[]) => [...list].sort((a, b) => Number(!!a.inputOnly) - Number(!!b.inputOnly));
        target =
          choose(byInputOnly(bp.pins.filter((p) => ok(p) && !hasBus(p) && !p.fns?.includes("analog") && !p.fns?.includes("led")))) ??
          choose(byInputOnly(bp.pins.filter((p) => ok(p) && !hasBus(p) && !p.fns?.includes("led")))) ??
          choose(byInputOnly(bp.pins.filter((p) => ok(p) && !hasBus(p)))) ??
          choose(byInputOnly(bp.pins.filter((p) => ok(p))));
        break;
      }
      case "sda":
      case "scl":
      case "mosi":
      case "miso":
      case "sck":
        target = bp.pins.find((p) => p.fns?.includes(pin.role as PinFn));
        break;
      case "tx": {
        const rxs = bp.pins.filter((p) => p.fns?.includes("rx") && free(p));
        target = rxs.find((p) => !/^(D0|RX|0)$/.test(p.id)) ?? rxs[0] ?? choose(bp.pins.filter((p) => free(p) && p.fns?.includes("digital") && !hasBus(p) && !p.inputOnly));
        break;
      }
      case "rx": {
        const txs = bp.pins.filter((p) => p.fns?.includes("tx") && free(p));
        target = txs.find((p) => !/^(D1|TX|1)$/.test(p.id)) ?? txs[0] ?? choose(bp.pins.filter((p) => free(p) && p.fns?.includes("digital") && !hasBus(p) && !p.inputOnly));
        break;
      }
      case "cs":
        target = bp.pins.find((p) => p.fns?.includes("cs") && free(p)) ?? choose(bp.pins.filter((p) => free(p) && !p.inputOnly && p.fns?.includes("digital") && !hasBus(p)));
        break;
      default:
        break;
    }
    if (!target) {
      skipped.push(pin.label);
      continue;
    }
    if (plain(target) && !SHARED_BUS.some((f) => target!.fns?.includes(f))) taken.add(target.id);
    planned.push({ from: { node: board.id, pin: target.id }, to: { node: part.id, pin: pin.id } });
  }
  return { board, wires: planned, skipped };
}

/** Node footprint on the canvas, for placement (matches the node renderer). */
export function nodeBox(partId: string): { w: number; h: number } {
  const { w, h } = nodeLayout(partId);
  return { w, h };
}

/** A free spot: right of the board for peripherals, in rows; boards stack to the left. */
export function placeNode(partId: string, nodes: LabNode[], anchor?: LabNode | null): { x: number; y: number } {
  const box = nodeBox(partId);
  const overlaps = (x: number, y: number) =>
    nodes.some((n) => {
      const b = nodeBox(n.partId);
      return x < n.x + b.w + 32 && x + box.w + 32 > n.x && y < n.y + b.h + 24 && y + box.h + 24 > n.y;
    });
  if (!nodes.length) return { x: 80, y: 80 };
  const isBoard = getPinout(partId).controller;
  const origin = anchor ?? nodes[0];
  const ob = nodeBox(origin.partId);
  const startX = isBoard ? origin.x : origin.x + ob.w + 120;
  const startY = origin.y;
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 8; row++) {
      const x = isBoard ? startX - col * 0 : startX + col * (box.w + 60);
      const y = isBoard ? startY + (row + 1) * (ob.h + 60) : startY + row * 40;
      if (!overlaps(x, y)) return { x, y };
    }
  }
  const maxY = Math.max(...nodes.map((n) => n.y + nodeBox(n.partId).h));
  return { x: origin.x, y: maxY + 60 };
}
