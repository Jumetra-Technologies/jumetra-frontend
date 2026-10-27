/**
 * Lab operations for the MCP server, built on the Engineering Lab's own code
 * (lib/lab and lib/parts). Every write goes through the same analysis, autowire
 * and simulation the browser uses, so a build an AI makes here opens in the Lab
 * exactly as it was checked.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { analyze, type Analysis } from "@kiungo/core/lab/circuit";
import { frameAt, serialLine } from "@kiungo/core/lab/simulate";
import { planAutoWire, placeNode } from "@kiungo/core/lab/autowire";
import { suggest } from "@kiungo/core/lab/suggest";
import { getPinout, hasPinout, PINOUTS } from "@kiungo/core/lab/pinout";
import { controlsFor, findControl, coerceInput, SOURCE_KEY, SOURCE_SET } from "@kiungo/core/lab/controls";
import { logEntry, makeId, newSession, nextLabel } from "@/lib/lab/store";
import { parseSessionFile, sessionFileName, toSessionFile, type SessionFile } from "@kiungo/core/lab/session-file";
import { getPart, PARTS, searchParts } from "@kiungo/core/parts";
import type { LabNode, LabSession, LabWire, LogKind, PinRef } from "@kiungo/core/lab/types";

export class LabError extends Error {}

// ---------------------------------------------------------------- storage

export class SessionStore {
  readonly dir: string;
  readonly exportsDir: string;
  // Default next to the package, not the current directory: desktop clients start servers from anywhere.
  constructor(root = process.env.KIUNGO_MCP_DATA ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "data")) {
    this.dir = join(root, "sessions");
    this.exportsDir = join(root, "exports");
    mkdirSync(this.dir, { recursive: true });
    mkdirSync(this.exportsDir, { recursive: true });
  }
  private path(id: string) {
    if (!/^[\w-]+$/.test(id)) throw new LabError(`Bad session id “${id}”.`);
    return join(this.dir, `${id}.json`);
  }
  list(): LabSession[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(this.dir, f), "utf8")) as LabSession)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(id: string): LabSession {
    const p = this.path(id);
    if (!existsSync(p)) throw new LabError(`No session “${id}”. Call list_sessions to see the ids.`);
    return JSON.parse(readFileSync(p, "utf8")) as LabSession;
  }
  save(session: LabSession): LabSession {
    const next = { ...session, updatedAt: new Date().toISOString() };
    if (next.log.length > 400) next.log = next.log.slice(-400);
    writeFileSync(this.path(next.id), JSON.stringify(next, null, 2));
    return next;
  }
  delete(id: string) {
    rmSync(this.path(id), { force: true });
  }
  writeExport(session: LabSession, generator: string): { path: string; fileName: string; file: SessionFile } {
    const file = toSessionFile(session, generator);
    const fileName = sessionFileName(session);
    const path = join(this.exportsDir, fileName);
    writeFileSync(path, JSON.stringify(file, null, 2));
    return { path, fileName, file };
  }
}

// ---------------------------------------------------------------- helpers

const log = (s: LabSession, kind: LogKind, text: string, nodes?: string[]): LabSession => ({ ...s, log: [...s.log, logEntry(kind, text, nodes)] });

/** A node by id or by its label (case-insensitive), so models can say "Sonar" instead of an id. */
export function resolveNode(s: LabSession, ref: string): LabNode {
  const byId = s.nodes.find((n) => n.id === ref);
  if (byId) return byId;
  const lower = ref.trim().toLowerCase();
  const byLabel = s.nodes.filter((n) => n.label.toLowerCase() === lower);
  if (byLabel.length === 1) return byLabel[0];
  if (byLabel.length > 1) throw new LabError(`More than one part is labeled “${ref}”; use its node id.`);
  throw new LabError(`No part “${ref}” in this session. Parts: ${s.nodes.map((n) => `${n.label} (${n.id})`).join(", ") || "none"}.`);
}

function resolvePin(s: LabSession, ref: { node: string; pin: string }): PinRef {
  const node = resolveNode(s, ref.node);
  const pins = getPinout(node.partId).pins;
  const pin = pins.find((p) => p.id === ref.pin) ?? pins.find((p) => p.id.toLowerCase() === ref.pin.toLowerCase() || p.label.toLowerCase() === ref.pin.toLowerCase());
  if (!pin) throw new LabError(`${node.label} has no pin “${ref.pin}”. Its pins: ${pins.map((p) => p.id).join(", ")}.`);
  return { node: node.id, pin: pin.id };
}

const labelOf = (s: LabSession, id: string) => s.nodes.find((n) => n.id === id)?.label ?? id;
const pinText = (s: LabSession, r: PinRef) => `${labelOf(s, r.node)}.${r.pin}`;

// ---------------------------------------------------------------- views

export function partSummary(id: string) {
  const part = getPart(id);
  const p = getPinout(id);
  return { part_id: id, name: part?.name ?? id, group: part?.group, controller: p.controller, logic_v: p.logic, summary: part?.summary?.split(". ")[0] };
}

export function listParts(query?: string, group?: string) {
  const buildable = new Set(PINOUTS.map((p) => p.partId));
  const pool = query ? searchParts(query) : PARTS;
  return pool.filter((p) => buildable.has(p.id) && (!group || p.group === group)).map((p) => partSummary(p.id));
}

export function partDetail(id: string) {
  if (!hasPinout(id)) throw new LabError(`The lab has no part “${id}”. Call search_parts.`);
  const p = getPinout(id);
  const part = getPart(id);
  return {
    ...partSummary(id),
    tolerates_5v: p.tolerates5V,
    supply_range_v: p.supply,
    description: part?.summary,
    pins: p.pins.map((pin) => ({
      pin: pin.id,
      label: pin.label,
      ...(p.controller ? { can: pin.fns, supplies_v: pin.supplies, input_only: pin.inputOnly || undefined } : { needs: pin.role, required: pin.required || undefined }),
      note: pin.note,
    })),
  };
}

export function checkCircuit(s: LabSession, analysis: Analysis = analyze(s.nodes, s.wires)) {
  const by = (sev: string) => analysis.faults.filter((f) => f.severity === sev).length;
  return {
    ok: by("error") === 0,
    errors: by("error"),
    warnings: by("warning"),
    tips: by("tip"),
    faults: analysis.faults.map((f) => ({ id: f.id, severity: f.severity, title: f.title, detail: f.detail, parts: f.nodes.map((n) => labelOf(s, n)), wire_ids: f.wires })),
    parts: s.nodes.map((n) => {
      const r = analysis.nodes[n.id];
      return { node_id: n.id, label: n.label, part_id: n.partId, status: r?.status, powered: r?.powered, grounded: r?.grounded, supply_v: r?.supplyV ?? undefined };
    }),
  };
}

export function describe(s: LabSession) {
  const check = checkCircuit(s);
  return {
    session_id: s.id,
    name: s.name,
    part_count: s.nodes.length,
    wire_count: s.wires.length,
    parts: check.parts,
    wires: s.wires.map((w) => ({ wire_id: w.id, from: pinText(s, w.from), to: pinText(s, w.to) })),
    inputs: s.inputs ?? {},
    check: { ok: check.ok, errors: check.errors, warnings: check.warnings, tips: check.tips, faults: check.faults },
  };
}

// ---------------------------------------------------------------- edits

export function createSession(name: string): LabSession {
  return log(newSession({ name }), "note", "Created by an AI model through the Kiungo MCP server");
}

export function importSession(text: string) {
  return parseSessionFile(text);
}

function applyWires(s: LabSession, list: Array<{ from: PinRef; to: PinRef }>): { session: LabSession; added: LabWire[] } {
  const added: LabWire[] = [];
  let wires = s.wires;
  for (const { from, to } of list) {
    if (from.node === to.node && from.pin === to.pin) continue;
    const dup = wires.some((w) => (w.from.node === from.node && w.from.pin === from.pin && w.to.node === to.node && w.to.pin === to.pin) || (w.from.node === to.node && w.from.pin === to.pin && w.to.node === from.node && w.to.pin === from.pin));
    if (dup) continue;
    const wire: LabWire = { id: makeId("w"), from, to };
    wires = [...wires, wire];
    added.push(wire);
  }
  return { session: { ...s, wires }, added };
}

export function addPart(s: LabSession, partId: string, opts: { label?: string; near?: string; x?: number; y?: number; autowire?: boolean; board?: string } = {}) {
  if (!hasPinout(partId)) {
    const hint = searchParts(partId).filter((p) => hasPinout(p.id)).slice(0, 5).map((p) => p.id);
    throw new LabError(`The lab has no part “${partId}”.${hint.length ? ` Did you mean: ${hint.join(", ")}?` : " Call search_parts."}`);
  }
  if (opts.label && s.nodes.some((n) => n.label.toLowerCase() === opts.label!.toLowerCase())) throw new LabError(`A part is already labeled “${opts.label}”.`);
  const anchor = opts.near ? resolveNode(s, opts.near) : opts.board ? resolveNode(s, opts.board) : (s.nodes.find((n) => getPinout(n.partId).controller) ?? null);
  const at = opts.x !== undefined && opts.y !== undefined ? { x: opts.x, y: opts.y } : placeNode(partId, s.nodes, anchor);
  const node: LabNode = { id: makeId("n"), partId, label: opts.label ?? nextLabel(s.nodes, partId), x: Math.round(at.x), y: Math.round(at.y), mode: "virtual" };
  let next = log({ ...s, nodes: [...s.nodes, node] }, "build", `Added ${node.label}`, [node.id]);
  let added: LabWire[] = [];
  let skipped: string[] = [];
  let board: LabNode | null = null;
  if (opts.autowire !== false && !getPinout(partId).controller) {
    const plan = planAutoWire(node, next.nodes, next.wires, opts.board ? resolveNode(s, opts.board).id : undefined);
    board = plan.board;
    skipped = plan.skipped;
    const r = applyWires(next, plan.wires);
    next = r.session;
    added = r.added;
    if (added.length && board) next = log(next, "wire", `Auto-wired ${node.label} to ${board.label} (${added.length} wires)`, [node.id, board.id]);
  }
  return { session: next, node, board, added, skipped };
}

export function connectPins(s: LabSession, from: { node: string; pin: string }, to: { node: string; pin: string }) {
  const a = resolvePin(s, from);
  const b = resolvePin(s, to);
  if (a.node === b.node && a.pin === b.pin) throw new LabError("A wire needs two different pins.");
  const r = applyWires(s, [{ from: a, to: b }]);
  if (!r.added.length) throw new LabError(`${pinText(s, a)} and ${pinText(s, b)} are already wired.`);
  return { session: log(r.session, "wire", `Wired ${pinText(s, a)} → ${pinText(s, b)}`, [a.node, b.node]), wire: r.added[0] };
}

export function autowirePart(s: LabSession, nodeRef: string, boardRef?: string) {
  const node = resolveNode(s, nodeRef);
  if (getPinout(node.partId).controller) throw new LabError(`${node.label} is a board; autowire a part to it instead.`);
  const plan = planAutoWire(node, s.nodes, s.wires, boardRef ? resolveNode(s, boardRef).id : undefined);
  if (!plan.board) throw new LabError("There is no board in this session to wire to. Add one first.");
  const r = applyWires(s, plan.wires);
  const session = r.added.length ? log(r.session, "wire", `Auto-wired ${node.label} to ${plan.board.label} (${r.added.length} wires)`, [node.id, plan.board.id]) : r.session;
  return { session, board: plan.board, added: r.added, skipped: plan.skipped };
}

export function removeItems(s: LabSession, nodeRefs: string[] = [], wireIds: string[] = []) {
  const ids = nodeRefs.map((r) => resolveNode(s, r).id);
  const missing = wireIds.filter((w) => !s.wires.some((x) => x.id === w));
  if (missing.length) throw new LabError(`No wire ${missing.join(", ")}.`);
  const gone = s.nodes.filter((n) => ids.includes(n.id));
  const next: LabSession = {
    ...s,
    nodes: s.nodes.filter((n) => !ids.includes(n.id)),
    wires: s.wires.filter((w) => !wireIds.includes(w.id) && !ids.includes(w.from.node) && !ids.includes(w.to.node)),
    inputs: Object.fromEntries(Object.entries(s.inputs ?? {}).filter(([id]) => !ids.includes(id))),
  };
  const removedWires = s.wires.length - next.wires.length;
  return { session: log(next, "build", `Removed ${[gone.map((n) => n.label).join(", "), removedWires ? `${removedWires} wire(s)` : ""].filter(Boolean).join(" and ")}`), removed_parts: gone.map((n) => n.label), removed_wires: removedWires };
}

export function moveRename(s: LabSession, nodeRef: string, patch: { x?: number; y?: number; label?: string }) {
  const node = resolveNode(s, nodeRef);
  if (patch.label && s.nodes.some((n) => n.id !== node.id && n.label.toLowerCase() === patch.label!.toLowerCase())) throw new LabError(`A part is already labeled “${patch.label}”.`);
  const updated = { ...node, ...(patch.x !== undefined ? { x: Math.round(patch.x) } : {}), ...(patch.y !== undefined ? { y: Math.round(patch.y) } : {}), ...(patch.label ? { label: patch.label.trim() } : {}) };
  return { ...s, nodes: s.nodes.map((n) => (n.id === node.id ? updated : n)) };
}

export function listControls(s: LabSession, nodeRef: string) {
  const node = resolveNode(s, nodeRef);
  const c = controlsFor(node, s.nodes, analyze(s.nodes, s.wires));
  return { node_id: node.id, label: node.label, title: c.title, note: c.note, controls: c.controls, current: s.inputs?.[node.id] ?? {} };
}

export function setInputs(s: LabSession, nodeRef: string, values: Record<string, number | string | boolean>) {
  const node = resolveNode(s, nodeRef);
  const allowed = controlsFor(node, s.nodes, analyze(s.nodes, s.wires)).controls;
  const accepted: Record<string, number | string | boolean> = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const control = allowed.find((c) => c.key === key) ?? findControl(node.partId, key);
    if (!control) {
      rejected.push(`${key}: not a control on ${node.label} (valid: ${allowed.map((c) => c.key).join(", ") || "none"})`);
      continue;
    }
    const v = coerceInput(control, value);
    if (v === null) {
      rejected.push(`${key}: ${JSON.stringify(value)} is out of range or the wrong type`);
      continue;
    }
    accepted[key] = v;
  }
  // Setting any value takes it over from the simulated sweep, as in the Inspector.
  const takeOver: Record<string, string> = Object.keys(accepted).some((k) => k !== SOURCE_KEY) && findControl(node.partId, SOURCE_KEY) && accepted[SOURCE_KEY] === undefined ? { [SOURCE_KEY]: SOURCE_SET } : {};
  const inputs = { ...(s.inputs ?? {}), [node.id]: { ...(s.inputs?.[node.id] ?? {}), ...takeOver, ...accepted } };
  const session = Object.keys(accepted).length ? log({ ...s, inputs }, "state", `${node.label}: set ${Object.entries(accepted).map(([k, v]) => `${k}=${v}`).join(", ")}`, [node.id]) : s;
  return { session, accepted, rejected };
}

export function simulate(s: LabSession, seconds: number, samples: number) {
  const analysis = analyze(s.nodes, s.wires);
  const n = Math.max(1, Math.min(60, Math.round(samples)));
  const span = Math.max(0.1, Math.min(600, seconds));
  const frames = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? span : (span * (i + 1)) / n;
    const f = frameAt(s.nodes, s.wires, analysis, t, true, s.inputs);
    const serial = serialLine(s.nodes, f);
    return {
      t_s: Math.round(t * 100) / 100,
      parts: Object.fromEntries(
        s.nodes.map((node) => {
          const live = f.nodes[node.id];
          return [node.label, live ? { on: live.on, level: Math.round(live.level * 100) / 100, ...(live.angle !== undefined ? { angle: Math.round(live.angle) } : {}), badge: live.badge, readings: Object.fromEntries(live.readings.map((r) => [r.label, r.value])), ...(live.text ? { display: live.text } : {}) } : null];
        }),
      ),
      ...(serial ? { serial } : {}),
    };
  });
  return {
    note: "Boards run Kiungo's built-in default sketch (sensors switch outputs; servos and motors follow their command or a demo sweep). Custom firmware does not run in the lab.",
    check: { ok: checkCircuit(s, analysis).ok, errors: analysis.faults.filter((f) => f.severity === "error").map((f) => f.title) },
    frames,
  };
}

export function billOfMaterials(s: LabSession) {
  const counts = new Map<string, number>();
  for (const n of s.nodes) counts.set(n.partId, (counts.get(n.partId) ?? 0) + 1);
  const rows = [...counts.entries()].map(([id, qty]) => ({ part_id: id, name: getPart(id)?.name ?? id, qty }));
  return { rows, total_parts: s.nodes.length, jumper_wires: s.wires.length, assumed: analyze(s.nodes, s.wires).faults.filter((f) => f.title.startsWith("Assumed")).map((f) => f.title) };
}
