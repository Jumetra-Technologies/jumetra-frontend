"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Box,
  Check,
  ChevronDown,
  CloudOff,
  Copy,
  Cpu,
  Download,
  FilePlus2,
  FolderKanban,
  FolderOpen,
  Grid2x2,
  Link2,
  Maximize,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Scissors,
  Server,
  SkipForward,
  Trash2,
  Undo2,
  Wand2,
  Zap,
} from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ContextMenu, Menu, type MenuEntry } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { getPart, partHref } from "@/lib/parts";
import { analyze, type Analysis } from "@/lib/lab/circuit";
import { frameAt, serialLine } from "@/lib/lab/simulate";
import { describeChanges, RunRecorder } from "@/lib/lab/activity";
import { planAutoWire, placeNode } from "@/lib/lab/autowire";
import { getPinout } from "@/lib/lab/pinout";
import { backendReachable, reconcile, type RuntimeStatus } from "@/lib/lab/runtime";
import { flushLab, useActiveSession, useLab } from "@/lib/lab/store";
import type { LabNode, LabView } from "@/lib/lab/types";
import { getServerRoboticsDataSnapshot, readRoboticsData, subscribeToRoboticsData } from "@/lib/robotics-data";
import { cn } from "@/lib/utils";
import { AddPanel, TEMPLATES, type AddPanelHandle } from "./AddPanel";
import { Inspector } from "./Inspector";
import { LabCanvas, type LabCanvasHandle } from "./LabCanvas";
import { LabContext, type LabContextValue } from "./lab-context";
import { LabDock, type DockTab } from "./LabDock";
import { LabSkeleton } from "./LabSkeleton";

const VIEW_OPTIONS = [
  { id: "reality" as const, label: "3D model", icon: <Box className="size-4" aria-hidden />, description: "the parts as they sit on the bench" },
  { id: "top" as const, label: "Top view", icon: <Grid2x2 className="size-4" aria-hidden />, description: "every part from above, with labelled pins" },
  { id: "flow" as const, label: "Current flow", icon: <Zap className="size-4" aria-hidden />, description: "where current and data go, and where they stop" },
];

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const TICK_MS = 100;

function useIsWide(query = "(min-width: 1024px)") {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : true),
    () => true,
  );
}

function relative(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export function EngineeringLab({ sessionId, newForProject }: { sessionId?: string; newForProject?: string }) {
  const router = useRouter();
  const hydrated = useLab((s) => s.hydrated);
  const sessions = useLab((s) => s.sessions);
  const saveError = useLab((s) => s.saveError);
  const past = useLab((s) => s.past.length);
  const future = useLab((s) => s.future.length);
  const session = useActiveSession();
  const store = useLab;
  const projectsData = useSyncExternalStore(subscribeToRoboticsData, readRoboticsData, getServerRoboticsDataSnapshot);
  const projects = useMemo(() => projectsData?.projects ?? [], [projectsData]);
  const wide = useIsWide();
  const xl = useIsWide("(min-width: 1280px)");

  // Panels
  // Panels start open where there's room for them beside the canvas.
  const fits = (query: string) => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia(query).matches;
  const [leftOpen, setLeftOpenRaw] = useState(() => fits("(min-width: 1024px)"));
  const [rightOpen, setRightOpenRaw] = useState(() => fits("(min-width: 1280px)"));
  const [dockOpen, setDockOpen] = useState(() => fits("(min-height: 720px) and (min-width: 768px)"));
  const [dockTab, setDockTab] = useState<DockTab>("activity");
  const [dockHeight, setDockHeight] = useState(200);
  const [autowire, setAutowire] = useState(true);

  // Selection and feedback
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [flash, setFlash] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ at: { x: number; y: number }; target: { node?: string; wire?: string; flow?: { x: number; y: number } } } | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Simulation
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [serial, setSerial] = useState<string[]>([]);
  const recorder = useRef<RunRecorder | null>(null);

  // Runtime mirror
  const [runtime, setRuntime] = useState<RuntimeStatus>("checking");

  // On narrow screens the panels are overlays: one at a time.
  const [lastPanel, setLastPanel] = useState<"left" | "right">("left");
  const setLeftOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setLeftOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (next) setLastPanel("left");
      return next;
    });
  }, []);
  const setRightOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setRightOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (next) setLastPanel("right");
      return next;
    });
  }, []);
  // Where panels overlay the canvas, show only the one opened last.
  const showLeft = leftOpen && (wide || !rightOpen || lastPanel === "left");
  const showRight = rightOpen && (xl || !showLeft || lastPanel === "right");

  // Imperative handles kept in state (not refs) so callbacks made during render may use them.
  const [canvasApi, setCanvasApi] = useState<LabCanvasHandle | null>(null);
  const [addPanelApi, setAddPanelApi] = useState<AddPanelHandle | null>(null);

  // ----- open the right session -------------------------------------------------
  const opened = useRef(false);
  useEffect(() => {
    if (!hydrated) store.getState().hydrate();
  }, [hydrated, store]);

  useEffect(() => {
    if (!hydrated || opened.current) return;
    opened.current = true;
    const state = store.getState();
    if (newForProject) {
      const project = readRoboticsData().projects.find((p) => p.id === newForProject);
      state.createSession({ name: project ? `${project.name} lab` : "Untitled lab", projectId: project?.id ?? null });
    } else if (sessionId && state.sessions.some((s) => s.id === sessionId)) {
      state.openSession(sessionId);
    } else if (!state.sessions.length || !state.activeId) {
      state.createSession({ name: "My first lab" });
    }
  }, [hydrated, sessionId, newForProject, store]);

  // Keep the URL pointing at the open session, so it can be bookmarked or shared to another tab.
  useEffect(() => {
    if (!session) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("session") === session.id && !url.searchParams.has("project")) return;
    url.searchParams.set("session", session.id);
    url.searchParams.delete("project");
    url.searchParams.delete("workspace");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [session]);

  useEffect(() => {
    const save = () => flushLab();
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      flushLab();
    };
  }, []);

  // ----- analysis, frames and the log ------------------------------------------
  const nodes = useMemo(() => session?.nodes ?? [], [session?.nodes]);
  const wires = useMemo(() => session?.wires ?? [], [session?.wires]);
  const analysis = useMemo(() => analyze(nodes, wires), [nodes, wires]);
  const frame = useMemo(() => frameAt(nodes, wires, analysis, t, running), [nodes, wires, analysis, t, running]);

  const prevAnalysis = useRef<{ id: string; analysis: Analysis } | null>(null);
  useEffect(() => {
    if (!session) return;
    const prev = prevAnalysis.current;
    prevAnalysis.current = { id: session.id, analysis };
    if (!prev || prev.id !== session.id) return;
    const drafts = describeChanges(prev.analysis, analysis, nodes);
    for (const d of drafts) store.getState().log(d.kind, d.text, d.nodes);
  }, [analysis, session, nodes, store]);

  // Simulation clock. Each tick advances time and, once a simulated second,
  // has every board print its readings to the serial monitor.
  const latest = useRef({ nodes, wires, analysis, t });
  useEffect(() => {
    latest.current = { nodes, wires, analysis, t };
  }, [nodes, wires, analysis, t]);
  const lastSecond = useRef(-1);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const { nodes: ns, wires: ws, analysis: an, t: now } = latest.current;
      const next = Math.round((now + (TICK_MS / 1000) * speed) * 1000) / 1000;
      latest.current.t = next;
      setT(next);
      const second = Math.floor(next);
      if (second !== lastSecond.current) {
        lastSecond.current = second;
        const line = serialLine(ns, frameAt(ns, ws, an, next, true));
        if (line) setSerial((lines) => [...lines, line].slice(-300));
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, speed]);

  useEffect(() => {
    if (!running || !session) return;
    recorder.current?.setNodes(nodes);
    for (const d of recorder.current?.frame(frame, analysis) ?? []) store.getState().log(d.kind, d.text, d.nodes);
  }, [frame, running, session, nodes, analysis, store]);

  const startRun = useCallback(() => {
    if (running || !session) return;
    recorder.current = new RunRecorder(nodes);
    recorder.current.start(t);
    store.getState().log("run", `Run started${nodes.length ? ` with ${nodes.length} part${nodes.length === 1 ? "" : "s"}` : ""}`);
    setRunning(true);
  }, [running, session, nodes, t, store]);

  const stopRun = useCallback(() => {
    if (!running) return;
    setRunning(false);
    const result = recorder.current?.stop();
    recorder.current = null;
    if (result) {
      store.getState().log(result.draft.kind, result.draft.text);
      store.getState().addRunTime(result.ms);
    }
  }, [running, store]);

  const reset = useCallback(() => {
    if (running) stopRun();
    setT(0);
    setSerial([]);
    lastSecond.current = -1;
  }, [running, stopRun]);

  // Stop the run when switching sessions.
  const sessionIdRef = useRef(session?.id);
  useEffect(() => {
    if (sessionIdRef.current !== session?.id) {
      sessionIdRef.current = session?.id;
      setRunning(false);
      recorder.current = null;
      setT(0);
      setSerial([]);
      setSelectedNodes([]);
      setSelectedWire(null);
    }
  }, [session?.id]);

  // ----- runtime mirror ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void backendReachable().then((ok) => !cancelled && setRuntime(ok ? "online" : "offline"));
    return () => {
      cancelled = true;
    };
  }, []);
  const shape = session ? `${session.id}|${session.name}|${session.nodes.map((n) => n.id).join(",")}|${session.wires.map((w) => w.id).join(",")}` : "";
  useEffect(() => {
    if (runtime !== "online" && runtime !== "syncing") return;
    if (!session) return;
    const current = session;
    const id = window.setTimeout(async () => {
      setRuntime("syncing");
      try {
        const mapping = await reconcile(current);
        if (store.getState().activeId === current.id) store.getState().setRuntime(mapping);
        setRuntime("online");
      } catch {
        setRuntime("offline");
      }
    }, 1200);
    return () => window.clearTimeout(id);
    // Reconcile on structural changes only (shape), not every position nudge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, runtime === "offline" || runtime === "checking"]);

  // ----- actions ----------------------------------------------------------------
  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((cur) => (cur === text ? null : cur)), 3200);
  }, []);

  const select = useCallback((ids: string[], wire: string | null = null) => {
    setSelectedNodes(ids);
    setSelectedWire(wire);
  }, []);

  const focusNode = useCallback(
    (id: string) => {
      canvasApi?.focus(id);
      setFlash([id]);
      window.setTimeout(() => setFlash([]), 1400);
    },
    [canvasApi],
  );

  const autowireNode = useCallback(
    (id: string) => {
      const s = store.getState();
      const current = s.sessions.find((x) => x.id === s.activeId);
      const node = current?.nodes.find((n) => n.id === id);
      if (!current || !node) return 0;
      const plan = planAutoWire(node, current.nodes, current.wires);
      if (!plan.board) {
        showToast("Add a board first: parts wire to a board's pins.");
        return 0;
      }
      // Skip pins that are already wired.
      const wiredPins = new Set(current.wires.flatMap((w) => [w.from, w.to]).filter((r) => r.node === id).map((r) => r.pin));
      const fresh = plan.wires.filter((w) => !wiredPins.has(w.to.pin));
      if (!fresh.length) return 0;
      const bp = getPinout(plan.board.partId);
      const pp = getPinout(node.partId);
      const desc = fresh.map((w) => `${pp.pins.find((p) => p.id === w.to.pin)?.label ?? w.to.pin} → ${bp.pins.find((p) => p.id === w.from.pin)?.label ?? w.from.pin}`).join(", ");
      s.addWires(fresh, `Auto-wired ${node.label} to ${plan.board.label}: ${desc}`);
      if (plan.skipped.length) showToast(`${plan.board.label} has no free pin for ${plan.skipped.join(", ")}`);
      return fresh.length;
    },
    [store, showToast],
  );

  const addPart = useCallback(
    (partId: string, opts: { at?: { x: number; y: number }; autowire?: boolean; near?: string } = {}): LabNode | null => {
      const s = store.getState();
      const current = s.sessions.find((x) => x.id === s.activeId);
      if (!current) return null;
      const board = current.nodes.find((n) => getPinout(n.partId).controller);
      const anchor = opts.near ? current.nodes.find((n) => n.id === opts.near) : board;
      const pos = opts.at ?? placeNode(partId, current.nodes, anchor);
      const node = s.addNode(partId, pos);
      if (!node) return null;
      const isBoard = getPinout(partId).controller;
      let wired = 0;
      if (opts.autowire && !isBoard) wired = autowireNode(node.id);
      setSelectedNodes([node.id]);
      setSelectedWire(null);
      // Keep the board in view with the new part, so the wires make sense.
      window.setTimeout(() => (board && !isBoard ? canvasApi?.show([board.id, node.id]) : canvasApi?.focus(node.id)), 80);
      const name = getPart(partId)?.name ?? partId;
      if (!isBoard && opts.autowire && !board) showToast(`${name} added. Add a board to wire it up.`);
      else showToast(wired ? `${node.label} added and wired to ${board?.label}` : `${node.label} added`);
      return node;
    },
    [store, autowireNode, showToast, canvasApi],
  );

  const runTemplate = useCallback(
    (id: string) => {
      const template = TEMPLATES.find((x) => x.id === id);
      if (!template) return;
      const s = store.getState();
      const current = s.sessions.find((x) => x.id === s.activeId);
      if (!current) return;
      let board = current.nodes.find((n) => getPinout(n.partId).controller);
      if (!board) board = addPart(template.board) ?? undefined;
      for (const partId of template.parts) addPart(partId, { autowire: true, near: board?.id });
      s.log("note", `Started from the “${template.title}” starter build`);
      window.setTimeout(() => canvasApi?.fit(), 350);
    },
    [store, addPart, canvasApi],
  );

  const openContextMenu = useCallback<LabContextValue["openContextMenu"]>((at, target) => setMenu({ at, target }), []);

  const ctx = useMemo<LabContextValue | null>(
    () =>
      session
        ? { session, analysis, frame, view: session.view, running, runtime, selectedNodes, selectedWire, flash, select, focusNode, addPart, autowireNode, openContextMenu }
        : null,
    [session, analysis, frame, running, runtime, selectedNodes, selectedWire, flash, select, focusNode, addPart, autowireNode, openContextMenu],
  );

  // ----- keyboard -----------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) store.getState().redo();
        else store.getState().undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        store.getState().redo();
      } else if (mod && e.key.toLowerCase() === "d" && !typing && selectedNodes.length) {
        e.preventDefault();
        select(store.getState().duplicateNodes(selectedNodes).map((n) => n.id));
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        if (running) stopRun();
        else startRun();
      } else if (!typing && !mod && e.key === "/") {
        e.preventDefault();
        setLeftOpen(true);
        window.setTimeout(() => addPanelApi?.focusSearch(), 0);
      } else if (!typing && !mod && ["1", "2", "3"].includes(e.key)) {
        store.getState().setView((["reality", "top", "flow"] as LabView[])[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, selectedNodes, select, running, startRun, stopRun, setLeftOpen, addPanelApi]);

  if (!hydrated || !session || !ctx) return <LabSkeleton />;

  const project = projects.find((p) => p.id === session.projectId) ?? null;
  const errors = analysis.faults.filter((f) => f.severity === "error").length;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ format: "kiungo-lab-session", version: 1, session }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name.replace(/[^\w-]+/g, "-").toLowerCase() || "lab"}.kiungo.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sessionMenu: MenuEntry[] = [
    { id: "new", label: "New lab session", icon: <FilePlus2 />, onSelect: () => store.getState().createSession({ name: "Untitled lab", projectId: session.projectId }) },
    {
      id: "open",
      label: "Open session",
      icon: <FolderOpen />,
      items: sessions.slice(0, 14).map((s) => ({ id: s.id, label: s.name, hint: `${s.nodes.length} parts · ${relative(s.updatedAt)}`, checked: s.id === session.id, onSelect: () => store.getState().openSession(s.id) })),
    },
    { id: "rename", label: "Rename", icon: <Pencil />, onSelect: () => setRenaming(true) },
    { id: "dup", label: "Duplicate session", icon: <Copy />, onSelect: () => store.getState().duplicateSession(session.id) },
    {
      id: "project",
      label: "Link to project",
      icon: <Link2 />,
      items: [
        { id: "none", label: "No project", checked: !session.projectId, onSelect: () => store.getState().linkProject(session.id, null) },
        ...(projects.length ? [{ type: "separator" as const, id: "sep" }] : []),
        ...projects.map((p) => ({ id: p.id, label: p.name, hint: p.category, checked: p.id === session.projectId, onSelect: () => store.getState().linkProject(session.id, p.id, p.name) })),
        { type: "separator" as const, id: "sep2" },
        { id: "create", label: "Create a project…", icon: <Plus />, onSelect: () => router.push("/workspace?new=1") },
      ],
    },
    { id: "export", label: "Export as JSON", icon: <Download />, onSelect: exportJson },
    { type: "separator", id: "s1" },
    { id: "projects", label: "All sessions in Projects", icon: <FolderKanban />, onSelect: () => router.push("/workspace") },
    {
      id: "delete",
      label: "Delete session",
      icon: <Trash2 />,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete “${session.name}” and its activity log? This can't be undone.`)) store.getState().deleteSession(session.id);
      },
    },
  ];

  const contextItems: MenuEntry[] = (() => {
    if (!menu) return [];
    const { node: nodeId, wire: wireId, flow } = menu.target;
    if (nodeId) {
      const node = session.nodes.find((n) => n.id === nodeId);
      if (!node) return [];
      const isBoard = getPinout(node.partId).controller;
      const nodeWires = session.wires.filter((w) => w.from.node === nodeId || w.to.node === nodeId);
      const targets = selectedNodes.includes(nodeId) ? selectedNodes : [nodeId];
      return [
        { type: "label", id: "l", label: node.label },
        { id: "inspect", label: "Inspect", icon: <PanelRight />, onSelect: () => (select([nodeId]), setRightOpen(true)) },
        ...(!isBoard ? [{ id: "autowire", label: "Auto-wire to board", icon: <Wand2 />, onSelect: () => autowireNode(nodeId) }] : []),
        ...(nodeWires.length ? [{ id: "unwire", label: `Remove ${nodeWires.length} wire${nodeWires.length === 1 ? "" : "s"}`, icon: <Scissors />, onSelect: () => store.getState().removeWires(nodeWires.map((w) => w.id)) }] : []),
        { id: "dup", label: targets.length > 1 ? `Duplicate ${targets.length} parts` : "Duplicate", icon: <Copy />, shortcut: "⌘D", onSelect: () => select(store.getState().duplicateNodes(targets).map((n) => n.id)) },
        { id: "library", label: "Open in Component library", icon: <BookOpen />, onSelect: () => router.push(partHref(node.partId)) },
        { type: "separator", id: "s" },
        { id: "delete", label: targets.length > 1 ? `Delete ${targets.length} parts` : "Delete", icon: <Trash2 />, shortcut: "⌫", danger: true, onSelect: () => store.getState().removeNodes(targets) },
      ];
    }
    if (wireId) {
      return [
        { id: "inspect", label: "Inspect wire", icon: <PanelRight />, onSelect: () => (select([], wireId), setRightOpen(true)) },
        { id: "delete", label: "Delete wire", icon: <Trash2 />, shortcut: "⌫", danger: true, onSelect: () => store.getState().removeWires([wireId]) },
      ];
    }
    const quick = ["arduino-uno", "esp32", "led", "dht11", "servo", "pir"].map((id) => ({ id, label: getPart(id)?.name ?? id, onSelect: () => addPart(id, { at: flow, autowire }) }));
    return [
      { id: "add", label: "Add part here", icon: <Plus />, items: quick },
      { id: "search", label: "Search parts…", icon: <Cpu />, shortcut: "/", onSelect: () => (setLeftOpen(true), window.setTimeout(() => addPanelApi?.focusSearch(), 0)) },
      { type: "separator", id: "s" },
      { id: "fit", label: "Fit to screen", icon: <Maximize />, onSelect: () => canvasApi?.fit() },
      { id: "undo", label: "Undo", icon: <Undo2 />, shortcut: "⌘Z", disabled: !past, onSelect: () => store.getState().undo() },
      { id: "redo", label: "Redo", icon: <Redo2 />, shortcut: "⇧⌘Z", disabled: !future, onSelect: () => store.getState().redo() },
    ];
  })();

  const runtimePill =
    runtime === "online" || runtime === "syncing"
      ? { icon: <Server className="size-3.5" aria-hidden />, text: runtime === "syncing" ? "Syncing runtime" : "Runtime connected", tone: "text-success", title: "Mirrored to the Kiungo backend for hybrid hardware" }
      : runtime === "checking"
        ? { icon: <Server className="size-3.5" aria-hidden />, text: "Checking runtime", tone: "text-muted", title: "Looking for the Kiungo backend" }
        : { icon: <CloudOff className="size-3.5" aria-hidden />, text: "Offline mode", tone: "text-muted", title: "The backend isn't reachable. Everything works and is saved in this browser; hybrid hardware needs the backend." };

  const panelLeft = (
    <AddPanel
      ref={setAddPanelApi}
      project={project ? { id: project.id, name: project.name, description: project.description, objectives: project.objectives, hardware: project.hardware, category: project.category } : null}
      autowire={autowire}
      onAutowire={setAutowire}
      onTemplate={runTemplate}
      onLinkProject={() => (projects.length ? showToast("Use the session menu: Link to project") : router.push("/workspace?new=1"))}
    />
  );

  return (
    <LabContext.Provider value={ctx}>
      <div className="hhip-lab flex h-full min-h-0 flex-col bg-background text-foreground" data-testid="engineering-lab">
        {/* Top bar */}
        <header className="relative z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-2 py-2 sm:px-3">
          <button type="button" onClick={() => setLeftOpen(!showLeft)} aria-pressed={showLeft} aria-label={showLeft ? "Hide components panel" : "Show components panel"} title="Components" className={cn("flex size-9 items-center justify-center rounded-[10px] transition-colors", showLeft ? "bg-muted-bg text-foreground" : "text-muted hover:bg-muted-bg")}>
            <PanelLeft className="size-4" />
          </button>
          <div className="flex min-w-0 items-center gap-1">
            {renaming ? (
              <input
                autoFocus
                defaultValue={session.name}
                aria-label="Session name"
                onBlur={(e) => {
                  store.getState().renameSession(session.id, e.target.value);
                  setRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-9 w-56 rounded-[10px] border border-primary bg-surface px-2.5 text-sm font-semibold outline-none"
              />
            ) : (
              <Menu label="Session menu" items={sessionMenu} buttonClassName="flex h-9 max-w-[16rem] items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-foreground hover:bg-muted-bg" title={`${session.name}: session menu`}>
                <span className="truncate" data-testid="session-name">
                  {session.name}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
              </Menu>
            )}
            {project ? (
              <Link href={`/workspace/projects/${project.id}`} className="hidden max-w-[12rem] items-center gap-1 truncate rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-medium text-primary hover:underline 2xl:inline-flex" title="Open the project">
                <FolderKanban className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{project.name}</span>
              </Link>
            ) : null}
          </div>

          <SegmentedControl value={session.view} onChange={(v) => store.getState().setView(v)} options={VIEW_OPTIONS} label="Canvas view" size="sm" className="order-last mx-auto w-full sm:order-none sm:w-auto [&_button]:px-3" />

          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" onClick={running ? stopRun : startRun} variant={running ? "secondary" : "default"} className="min-w-[5.5rem]" data-testid="run-toggle" title={running ? "Stop (⌘↵)" : "Run the default sketch (⌘↵)"}>
              {running ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              {running ? "Stop" : "Run"}
            </Button>
            <span className="hidden w-14 text-right font-mono text-xs tabular-nums text-muted sm:inline" data-testid="sim-time" aria-label={`Simulated time ${t.toFixed(1)} seconds`}>
              {t.toFixed(1)} s
            </span>
            <div className="hidden items-center gap-0.5 md:flex">
              <button type="button" onClick={() => (running ? undefined : setT((v) => Math.round((v + 0.1) * 10) / 10))} disabled={running} title="Step 100 ms" aria-label="Step 100 ms" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-40">
                <SkipForward className="size-4" />
              </button>
              <button type="button" onClick={reset} title="Reset to 0 s" aria-label="Reset simulation" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground">
                <RotateCcw className="size-4" />
              </button>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Simulation speed" className="h-8 rounded-[8px] border border-border bg-surface px-1.5 text-xs">
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </div>
            <span className="mx-1 hidden h-6 w-px bg-border md:block" aria-hidden />
            <div className="hidden items-center gap-0.5 sm:flex">
              <button type="button" onClick={() => store.getState().undo()} disabled={!past} title="Undo (⌘Z)" aria-label="Undo" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-35">
                <Undo2 className="size-4" />
              </button>
              <button type="button" onClick={() => store.getState().redo()} disabled={!future} title="Redo (⇧⌘Z)" aria-label="Redo" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-35">
                <Redo2 className="size-4" />
              </button>
            </div>
            <Menu
              label="More"
              align="end"
              buttonClassName="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground md:hidden"
              items={[
                { id: "step", label: "Step 100 ms", icon: <SkipForward />, disabled: running, onSelect: () => setT((v) => Math.round((v + 0.1) * 10) / 10) },
                { id: "reset", label: "Reset", icon: <RotateCcw />, onSelect: reset },
                { id: "speed", label: `Speed ${speed}×`, items: SPEEDS.map((s) => ({ id: String(s), label: `${s}×`, checked: s === speed, onSelect: () => setSpeed(s) })) },
                { id: "undo", label: "Undo", icon: <Undo2 />, disabled: !past, onSelect: () => store.getState().undo() },
                { id: "redo", label: "Redo", icon: <Redo2 />, disabled: !future, onSelect: () => store.getState().redo() },
              ]}
            >
              <MoreHorizontal className="size-4" />
            </Menu>
            <span className={cn("hidden size-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border text-[11.5px] font-medium lg:inline-flex 2xl:w-auto 2xl:px-2.5", runtimePill.tone)} title={`${runtimePill.text}: ${runtimePill.title}`} aria-label={runtimePill.text} data-testid="runtime-status">
              {runtimePill.icon}
              <span className="hidden 2xl:inline">{runtimePill.text}</span>
            </span>
            <span className={cn("hidden items-center gap-1 text-[11.5px] lg:inline-flex", saveError ? "text-danger" : "text-muted")} title={saveError ? "Browser storage is full or blocked: changes aren't being saved" : "Saved in this browser"} aria-label={saveError ? "Not saved" : "Saved in this browser"} data-testid="save-status">
              {saveError ? "Not saved" : (
                <>
                  <Check className="size-3.5 text-success" aria-hidden /> <span className="hidden 2xl:inline">Saved</span>
                </>
              )}
            </span>
            <button type="button" onClick={() => setRightOpen(!showRight)} aria-pressed={showRight} aria-label={showRight ? "Hide inspector" : "Show inspector"} title="Inspector" className={cn("flex size-9 items-center justify-center rounded-[10px] transition-colors", showRight ? "bg-muted-bg text-foreground" : "text-muted hover:bg-muted-bg")}>
              <PanelRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {/* Left: add components */}
          {showLeft ? (
            <>
              {!wide ? <button type="button" aria-label="Close components panel" onClick={() => setLeftOpen(false)} className="absolute inset-0 z-30 bg-black/30" /> : null}
              <aside className={cn("flex w-[300px] max-w-[86vw] shrink-0 flex-col border-r border-border bg-surface", !wide && "absolute inset-y-0 left-0 z-40 shadow-[var(--shadow-md)]")} aria-label="Components">
                {panelLeft}
              </aside>
            </>
          ) : null}

          {/* Canvas */}
          <main className="relative min-h-0 min-w-0 flex-1 bg-canvas" aria-label="Circuit canvas">
            <LabCanvas ref={setCanvasApi} onDropPart={(partId, at) => addPart(partId, { at, autowire })} />

            {session.nodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="pointer-events-auto w-full max-w-md rounded-[18px] border border-border bg-surface/95 p-6 text-center shadow-[var(--shadow-md)] backdrop-blur" data-testid="lab-empty">
                  <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                    <Cpu className="size-5" aria-hidden />
                  </div>
                  <h2 className="text-lg font-semibold">Start with a board</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">Pick a board, then add parts: they wire themselves to it. Or start from a ready-made build.</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["arduino-uno", "esp32", "raspberry-pi-pico"].map((id) => (
                      <button key={id} type="button" onClick={() => addPart(id)} className="rounded-[12px] border border-border px-2 py-3 text-[12.5px] font-medium transition-colors hover:border-primary hover:bg-accent" data-testid={`quick-${id}`}>
                        {getPart(id)?.name.replace(" DevKit V1", "").replace("Raspberry Pi ", "")}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {TEMPLATES.map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => runTemplate(tpl.id)} className="rounded-full bg-muted-bg px-3 py-1 text-[12px] font-medium text-foreground hover:bg-accent hover:text-primary">
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[11.5px] text-muted">
                    Press <kbd className="rounded border border-border px-1 font-mono">/</kbd> to search parts, or drag them in from the left.
                  </p>
                </div>
              </div>
            ) : null}

            {session.view === "flow" && session.nodes.length ? (
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface/95 px-3 py-1.5 text-[11.5px] shadow-[var(--shadow-sm)] backdrop-blur" data-testid="flow-banner">
                <span className={cn("size-2 shrink-0 rounded-full", errors ? "bg-danger hhip-fault-pulse" : running ? "bg-success" : "bg-muted")} aria-hidden />
                <span className="font-semibold text-foreground">{errors ? `${errors} fault${errors === 1 ? "" : "s"} stopping current` : running ? "Current flowing" : "Stopped"}</span>
                <span className="hidden truncate text-muted sm:inline">{errors ? "Dashed red wires show where" : running ? "Dots show current and data; dim wires are idle" : "Press Run to start the sketch"}</span>
              </div>
            ) : null}

            {toast ? (
              <div role="status" className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-foreground px-3.5 py-1.5 text-[12.5px] font-medium text-background shadow-[var(--shadow-md)] hhip-menu-pop" data-testid="lab-toast">
                {toast}
              </div>
            ) : null}
          </main>

          {/* Right: inspector */}
          {showRight ? (
            <>
              {!xl ? <button type="button" aria-label="Close inspector" onClick={() => setRightOpen(false)} className="absolute inset-0 z-30 bg-black/20 xl:hidden" /> : null}
              <aside className={cn("hhip-scroll w-[320px] max-w-[88vw] shrink-0 overflow-y-auto border-l border-border bg-surface", !xl && "absolute inset-y-0 right-0 z-40 shadow-[var(--shadow-md)]")} aria-label="Inspector">
                <Inspector />
              </aside>
            </>
          ) : null}
        </div>

        <LabDock
          tab={dockTab}
          onTab={setDockTab}
          open={dockOpen}
          onOpen={setDockOpen}
          height={dockHeight}
          onHeight={setDockHeight}
          serial={serial}
          onClearSerial={() => setSerial([])}
          terminalApi={{
            session,
            analysis,
            frame,
            running,
            addPart: (partId, wire) => addPart(partId, { autowire: wire }),
            removeNodes: (ids) => store.getState().removeNodes(ids),
            addWire: (a, b) => store.getState().addWire(a, b),
            autowire: autowireNode,
            unwire: (id) => {
              const ws = session.wires.filter((w) => w.from.node === id || w.to.node === id);
              store.getState().removeWires(ws.map((w) => w.id));
              return ws.length;
            },
            run: startRun,
            stop: stopRun,
            step: () => setT((v) => Math.round((v + 0.1) * 10) / 10),
            reset,
            setView: (v) => store.getState().setView(v),
          }}
        />

        <ContextMenu at={menu?.at ?? null} items={contextItems} onClose={() => setMenu(null)} />
      </div>
    </LabContext.Provider>
  );
}
