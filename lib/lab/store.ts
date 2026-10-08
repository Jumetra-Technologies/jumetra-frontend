"use client";

/**
 * Lab sessions, saved in this browser.
 *
 * One store holds every session and which one is open. Edits to the open
 * session go through actions that keep an undo history; everything is written
 * to localStorage shortly after it changes and re-read when another tab
 * changes it, so the Projects page and the lab stay in step.
 */

import { create } from "zustand";
import { getPart } from "@/lib/parts";
import { getPinout } from "./pinout";
import type { DeviceMode, LabData, LabNode, LabSession, LabView, LabWire, LogEntry, LogKind, PinRef } from "./types";

export const LAB_STORAGE_KEY = "hhip.lab:v1";
const MAX_LOG = 400;
const MAX_HISTORY = 60;

export function makeId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

const now = () => new Date().toISOString();

export function logEntry(kind: LogKind, text: string, nodes?: string[]): LogEntry {
  return { id: makeId("log"), at: now(), kind, text, ...(nodes?.length ? { nodes } : {}) };
}

export function newSession(input: { name?: string; projectId?: string | null; nodes?: LabNode[]; wires?: LabWire[] } = {}): LabSession {
  const at = now();
  const name = input.name?.trim() || "Untitled lab";
  return {
    id: makeId("lab"),
    name,
    projectId: input.projectId ?? null,
    createdAt: at,
    updatedAt: at,
    nodes: input.nodes ?? [],
    wires: input.wires ?? [],
    log: [logEntry("session", `Session “${name}” started`)],
    view: "top",
    runMs: 0,
    runtime: null,
  };
}

/** Short names for the canvas; catalogue names are written for the library. */
const SHORT: Record<string, string> = {
  "arduino-uno": "Arduino Uno",
  "arduino-mega": "Arduino Mega",
  esp32: "ESP32",
  esp8266: "NodeMCU",
  "raspberry-pi-pico": "Pico",
  "raspberry-pi-4": "Raspberry Pi 4",
  stm32: "Blue Pill",
  microbit: "micro:bit",
  teensy: "Teensy 4.1",
  dht11: "DHT11",
  dht22: "DHT22",
  am2302: "AM2302",
  "hc-sr04": "HC-SR04",
  pir: "PIR sensor",
  ldr: "LDR",
  ds18b20: "DS18B20",
  "soil-moisture": "Soil sensor",
  mq2: "MQ-2",
  mpu6050: "MPU-6050",
  bmp280: "BMP280",
  led: "LED",
  "rgb-led": "RGB LED",
  buzzer: "Buzzer",
  servo: "Servo",
  "dc-motor": "DC motor",
  relay: "Relay",
  "stepper-motor": "Stepper",
  "lcd-16x2": "LCD 16×2",
  "oled-ssd1306": "OLED",
  "tft-display": "TFT display",
  "hc-05": "HC-05",
  "wifi-module": "ESP-01",
  nrf24l01: "nRF24",
  lora: "LoRa",
};

export function shortName(partId: string): string {
  return SHORT[partId] ?? (getPart(partId)?.name ?? partId).split(",")[0].replace(/\s*\(.*\)\s*$/, "");
}

/** A unique, readable label: "LED", "LED 2", … */
export function nextLabel(nodes: LabNode[], partId: string): string {
  const short = shortName(partId);
  const taken = new Set(nodes.map((n) => n.label));
  if (!taken.has(short)) return short;
  for (let i = 2; ; i++) if (!taken.has(`${short} ${i}`)) return `${short} ${i}`;
}

function sanitize(raw: unknown): LabData {
  const empty: LabData = { version: 1, sessions: [], activeId: null };
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<LabData>;
  const sessions = Array.isArray(data.sessions)
    ? data.sessions
        .filter((s): s is LabSession => !!s && typeof s === "object" && typeof (s as LabSession).id === "string")
        .map((s) => ({
          ...s,
          name: typeof s.name === "string" ? s.name : "Untitled lab",
          projectId: typeof s.projectId === "string" ? s.projectId : null,
          nodes: Array.isArray(s.nodes) ? s.nodes : [],
          wires: Array.isArray(s.wires) ? s.wires : [],
          log: Array.isArray(s.log) ? s.log : [],
          view: (s.view === "reality" || s.view === "flow" ? s.view : "top") as LabView,
          runMs: Number(s.runMs) || 0,
        }))
    : [];
  return { version: 1, sessions, activeId: typeof data.activeId === "string" ? data.activeId : null };
}

export function readLabData(): LabData {
  if (typeof window === "undefined") return { version: 1, sessions: [], activeId: null };
  try {
    return sanitize(JSON.parse(window.localStorage.getItem(LAB_STORAGE_KEY) ?? "null"));
  } catch {
    return { version: 1, sessions: [], activeId: null };
  }
}

export function writeLabData(data: LabData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

type Snapshot = { nodes: LabNode[]; wires: LabWire[] };

export interface LabState {
  hydrated: boolean;
  saveError: boolean;
  sessions: LabSession[];
  activeId: string | null;
  past: Snapshot[];
  future: Snapshot[];

  hydrate: () => void;
  createSession: (input?: Parameters<typeof newSession>[0]) => LabSession;
  openSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  linkProject: (id: string, projectId: string | null, projectName?: string) => void;
  duplicateSession: (id: string) => LabSession | null;
  deleteSession: (id: string) => void;
  setView: (view: LabView) => void;
  addNode: (partId: string, at?: { x: number; y: number }, label?: string) => LabNode | null;
  moveNode: (id: string, x: number, y: number) => void;
  renameNode: (id: string, label: string) => void;
  setNodeMode: (id: string, mode: DeviceMode) => void;
  removeNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => LabNode[];
  addWire: (from: PinRef, to: PinRef, opts?: { silent?: boolean }) => LabWire | null;
  addWires: (wires: Array<{ from: PinRef; to: PinRef }>, summary?: string) => LabWire[];
  removeWires: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  log: (kind: LogKind, text: string, nodes?: string[]) => void;
  addRunTime: (ms: number) => void;
  setRuntime: (runtime: LabSession["runtime"]) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useLab = create<LabState>((set, get) => {
  const active = () => get().sessions.find((s) => s.id === get().activeId) ?? null;

  /** Change the open session, keeping history for undo when the canvas changes. */
  const update = (fn: (s: LabSession) => LabSession, opts: { history?: boolean } = {}) => {
    const current = active();
    if (!current) return;
    const next = { ...fn(current), updatedAt: now() };
    if (next.log.length > MAX_LOG) next.log = next.log.slice(-MAX_LOG);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === current.id ? next : s)),
      ...(opts.history ? { past: [...state.past.slice(-MAX_HISTORY + 1), { nodes: current.nodes, wires: current.wires }], future: [] } : {}),
    }));
  };

  const updateById = (id: string, fn: (s: LabSession) => LabSession) =>
    set((state) => ({ sessions: state.sessions.map((s) => (s.id === id ? { ...fn(s), updatedAt: now() } : s)) }));

  return {
    hydrated: false,
    saveError: false,
    sessions: [],
    activeId: null,
    past: [],
    future: [],

    hydrate: () => {
      const data = readLabData();
      set({ hydrated: true, sessions: data.sessions, activeId: data.activeId && data.sessions.some((s) => s.id === data.activeId) ? data.activeId : (data.sessions[0]?.id ?? null) });
    },

    createSession: (input) => {
      const session = newSession(input);
      set((state) => ({ sessions: [session, ...state.sessions], activeId: session.id, past: [], future: [] }));
      return session;
    },

    openSession: (id) => {
      if (get().activeId === id) return;
      if (!get().sessions.some((s) => s.id === id)) return;
      set({ activeId: id, past: [], future: [] });
    },

    renameSession: (id, name) => {
      const clean = name.trim();
      if (!clean) return;
      updateById(id, (s) => (s.name === clean ? s : { ...s, name: clean, log: [...s.log, logEntry("note", `Renamed to “${clean}”`)] }));
    },

    linkProject: (id, projectId, projectName) =>
      updateById(id, (s) => ({ ...s, projectId, log: [...s.log, logEntry("note", projectId ? `Linked to project “${projectName ?? "project"}”` : "Unlinked from its project")] })),

    duplicateSession: (id) => {
      const source = get().sessions.find((s) => s.id === id);
      if (!source) return null;
      const copy: LabSession = { ...newSession({ name: `${source.name} (copy)`, projectId: source.projectId }), nodes: source.nodes.map((n) => ({ ...n })), wires: source.wires.map((w) => ({ ...w })), view: source.view };
      set((state) => ({ sessions: [copy, ...state.sessions], activeId: copy.id, past: [], future: [] }));
      return copy;
    },

    deleteSession: (id) =>
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id);
        return { sessions, activeId: state.activeId === id ? (sessions[0]?.id ?? null) : state.activeId, ...(state.activeId === id ? { past: [], future: [] } : {}) };
      }),

    setView: (view) => update((s) => ({ ...s, view })),

    addNode: (partId, at, label) => {
      const session = active();
      if (!session) return null;
      const part = getPart(partId);
      const node: LabNode = {
        id: makeId("n"),
        partId,
        label: label ?? nextLabel(session.nodes, partId),
        x: Math.round(at?.x ?? 80),
        y: Math.round(at?.y ?? 80),
        mode: "virtual",
      };
      update((s) => ({ ...s, nodes: [...s.nodes, node], log: [...s.log, logEntry("build", `Added ${node.label}${part ? "" : ` (${partId})`}`, [node.id])] }), { history: true });
      return node;
    },

    moveNode: (id, x, y) => {
      const node = active()?.nodes.find((n) => n.id === id);
      if (!node || (Math.round(node.x) === Math.round(x) && Math.round(node.y) === Math.round(y))) return;
      update((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)) }), { history: true });
    },

    renameNode: (id, label) => {
      const clean = label.trim();
      if (!clean) return;
      update((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, label: clean } : n)) }), { history: true });
    },

    setNodeMode: (id, mode) => {
      const node = active()?.nodes.find((n) => n.id === id);
      if (!node || node.mode === mode) return;
      update((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, mode } : n)), log: [...s.log, logEntry("build", `${node.label} set to ${mode}`, [id])] }), { history: true });
    },

    removeNodes: (ids) => {
      const session = active();
      if (!session || !ids.length) return;
      const gone = session.nodes.filter((n) => ids.includes(n.id));
      if (!gone.length) return;
      update(
        (s) => ({
          ...s,
          nodes: s.nodes.filter((n) => !ids.includes(n.id)),
          wires: s.wires.filter((w) => !ids.includes(w.from.node) && !ids.includes(w.to.node)),
          log: [...s.log, logEntry("build", `Removed ${gone.map((n) => n.label).join(", ")}`)],
        }),
        { history: true },
      );
    },

    duplicateNodes: (ids) => {
      const session = active();
      if (!session) return [];
      const copies: LabNode[] = [];
      let pool = [...session.nodes];
      for (const node of session.nodes.filter((n) => ids.includes(n.id))) {
        const copy = { ...node, id: makeId("n"), label: nextLabel(pool, node.partId), x: node.x + 40, y: node.y + 40 };
        copies.push(copy);
        pool = [...pool, copy];
      }
      if (!copies.length) return [];
      update((s) => ({ ...s, nodes: [...s.nodes, ...copies], log: [...s.log, logEntry("build", `Duplicated ${copies.map((c) => c.label).join(", ")}`, copies.map((c) => c.id))] }), { history: true });
      return copies;
    },

    addWire: (from, to, opts) => {
      const session = active();
      if (!session) return null;
      if (from.node === to.node && from.pin === to.pin) return null;
      const exists = session.wires.some((w) => (w.from.node === from.node && w.from.pin === from.pin && w.to.node === to.node && w.to.pin === to.pin) || (w.from.node === to.node && w.from.pin === to.pin && w.to.node === from.node && w.to.pin === from.pin));
      if (exists) return null;
      const a = session.nodes.find((n) => n.id === from.node);
      const b = session.nodes.find((n) => n.id === to.node);
      if (!a || !b) return null;
      const wire: LabWire = { id: makeId("w"), from, to };
      const pa = getPinout(a.partId).pins.find((p) => p.id === from.pin);
      const pb = getPinout(b.partId).pins.find((p) => p.id === to.pin);
      const text = `Wired ${a.label} ${pa?.label ?? from.pin} → ${b.label} ${pb?.label ?? to.pin}`;
      update((s) => ({ ...s, wires: [...s.wires, wire], log: opts?.silent ? s.log : [...s.log, logEntry("wire", text, [a.id, b.id])] }), { history: true });
      return wire;
    },

    addWires: (list, summary) => {
      const session = active();
      if (!session || !list.length) return [];
      const made: LabWire[] = list.map((w) => ({ id: makeId("w"), from: w.from, to: w.to }));
      const nodes = [...new Set(list.flatMap((w) => [w.from.node, w.to.node]))];
      update((s) => ({ ...s, wires: [...s.wires, ...made], log: summary ? [...s.log, logEntry("wire", summary, nodes)] : s.log }), { history: true });
      return made;
    },

    removeWires: (ids) => {
      const session = active();
      if (!session || !ids.length) return;
      const count = session.wires.filter((w) => ids.includes(w.id)).length;
      if (!count) return;
      update((s) => ({ ...s, wires: s.wires.filter((w) => !ids.includes(w.id)), log: [...s.log, logEntry("wire", count === 1 ? "Removed a wire" : `Removed ${count} wires`)] }), { history: true });
    },

    undo: () => {
      const { past, future } = get();
      const current = active();
      if (!current || !past.length) return;
      const prev = past[past.length - 1];
      set((state) => ({
        past: past.slice(0, -1),
        future: [{ nodes: current.nodes, wires: current.wires }, ...future].slice(0, MAX_HISTORY),
        sessions: state.sessions.map((s) => (s.id === current.id ? { ...s, nodes: prev.nodes, wires: prev.wires, updatedAt: now() } : s)),
      }));
    },

    redo: () => {
      const { past, future } = get();
      const current = active();
      if (!current || !future.length) return;
      const next = future[0];
      set((state) => ({
        future: future.slice(1),
        past: [...past, { nodes: current.nodes, wires: current.wires }].slice(-MAX_HISTORY),
        sessions: state.sessions.map((s) => (s.id === current.id ? { ...s, nodes: next.nodes, wires: next.wires, updatedAt: now() } : s)),
      }));
    },

    log: (kind, text, nodes) => update((s) => ({ ...s, log: [...s.log, logEntry(kind, text, nodes)] })),

    addRunTime: (ms) => update((s) => ({ ...s, runMs: s.runMs + Math.max(0, Math.round(ms)) })),

    setRuntime: (runtime) => update((s) => ({ ...s, runtime })),
  };
});

/** Save shortly after any change, and follow changes made in other tabs. */
if (typeof window !== "undefined") {
  useLab.subscribe((state, prev) => {
    if (!state.hydrated) return;
    if (state.sessions === prev.sessions && state.activeId === prev.activeId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = writeLabData({ version: 1, sessions: useLab.getState().sessions, activeId: useLab.getState().activeId });
      if (ok === useLab.getState().saveError) useLab.setState({ saveError: !ok });
    }, 200);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== LAB_STORAGE_KEY || !useLab.getState().hydrated) return;
    const data = readLabData();
    const { activeId } = useLab.getState();
    useLab.setState({ sessions: data.sessions, activeId: activeId && data.sessions.some((s) => s.id === activeId) ? activeId : (data.sessions[0]?.id ?? null) });
  });
}

/** Write any pending change now (before navigating away, say). */
export function flushLab() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const state = useLab.getState();
  if (state.hydrated) writeLabData({ version: 1, sessions: state.sessions, activeId: state.activeId });
}

export function useActiveSession(): LabSession | null {
  return useLab((s) => s.sessions.find((x) => x.id === s.activeId) ?? null);
}
