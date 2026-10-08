"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getPinout, pinTone, type LabPin } from "@/lib/lab/pinout";
import { nodeLayout } from "@/lib/lab/layout";
import { useLab } from "@/lib/lab/store";
import type { LabNode, LabWire } from "@/lib/lab/types";
import { useLabContext } from "./lab-context";
import { PartNode, type PartNodeData } from "./PartNode";
import { WireEdge, type WireEdgeData } from "./WireEdge";

const nodeTypes = { part: PartNode };
const edgeTypes = { wire: WireEdge };

export interface LabCanvasHandle {
  focus: (id: string) => void;
  /** Pan and zoom so these parts are all in view (no zooming in past 1). */
  show: (ids: string[]) => void;
  fit: () => void;
  center: () => { x: number; y: number };
  toFlow: (screen: { x: number; y: number }) => { x: number; y: number };
}

function toFlowNode(node: LabNode, selected: boolean): Node<PartNodeData> {
  const { w, h } = nodeLayout(node.partId);
  return { id: node.id, type: "part", position: { x: node.x, y: node.y }, data: { node }, selected, width: w, height: h, style: { width: w, height: h } };
}

/** Which way current or data moves along a wire, from the pins at each end. */
function wireMeta(wire: LabWire, nodes: LabNode[]): WireEdgeData {
  const nodeOf = (id: string) => nodes.find((n) => n.id === id);
  const pinOf = (nid: string, pid: string): LabPin | undefined => {
    const n = nodeOf(nid);
    return n ? getPinout(n.partId).pins.find((p) => p.id === pid) : undefined;
  };
  const a = pinOf(wire.from.node, wire.from.pin);
  const b = pinOf(wire.to.node, wire.to.pin);
  const boardIsSource = getPinout(nodeOf(wire.from.node)?.partId ?? "").controller;
  const boardIsTarget = getPinout(nodeOf(wire.to.node)?.partId ?? "").controller;
  const tones = [a, b].filter(Boolean).map((p) => pinTone(p!));
  // A wire takes the colour of what it carries: the peripheral's side says that best.
  const peripheralPin = boardIsSource && !boardIsTarget ? b : !boardIsSource && boardIsTarget ? a : undefined;
  const tone = tones.includes("power") ? "power" : tones.includes("ground") ? "ground" : peripheralPin ? pinTone(peripheralPin) : (tones.find((t) => t !== "muted" && t !== "digital") ?? tones[0] ?? "digital");
  const partPin = boardIsSource ? b : a;
  const role = partPin?.role;
  // Into the part: supply, drive, PWM, the part's RX, MOSI, clock, select.
  const intoPart = role === "vcc" || role === "drive" || role === "pwm" || role === "rx" || role === "mosi" || role === "sck" || role === "cs" || role === "scl" || role === undefined;
  const forward = boardIsSource ? intoPart : !intoPart;
  const label = `${nodeOf(wire.from.node)?.label ?? ""} ${a?.label ?? wire.from.pin} → ${nodeOf(wire.to.node)?.label ?? ""} ${b?.label ?? wire.to.pin}`;
  return { tone, reverse: !forward, label };
}

const Inner = forwardRef<LabCanvasHandle, { onDropPart: (partId: string, at: { x: number; y: number }) => void }>(function Inner({ onDropPart }, ref) {
  const { session, selectedNodes, selectedWire, select, openContextMenu, view } = useLabContext();
  const moveNode = useLab((s) => s.moveNode);
  const addWire = useLab((s) => s.addWire);
  const removeNodes = useLab((s) => s.removeNodes);
  const removeWires = useLab((s) => s.removeWires);
  const flow = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const fittedFor = useRef<string | null>(null);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node<PartNodeData>>(session.nodes.map((n) => toFlowNode(n, selectedNodes.includes(n.id))));

  useEffect(() => {
    setNodes(session.nodes.map((n) => toFlowNode(n, selectedNodes.includes(n.id))));
  }, [session.nodes, selectedNodes, setNodes]);

  const edges = useMemo<Edge[]>(
    () =>
      session.wires
        .filter((w) => session.nodes.some((n) => n.id === w.from.node) && session.nodes.some((n) => n.id === w.to.node))
        .map((w) => ({ id: w.id, type: "wire", source: w.from.node, sourceHandle: w.from.pin, target: w.to.node, targetHandle: w.to.pin, selected: w.id === selectedWire, data: wireMeta(w, session.nodes) })),
    [session.wires, session.nodes, selectedWire],
  );

  // Fit the view when a session opens, once React Flow has measured its parts.
  const initialized = useNodesInitialized();
  useEffect(() => {
    if (fittedFor.current === session.id) return;
    if (session.nodes.length && !initialized) return;
    fittedFor.current = session.id;
    const id = window.setTimeout(() => flow.fitView({ padding: 0.12, maxZoom: 1.1, duration: 0 }), 30);
    return () => window.clearTimeout(id);
  }, [session.id, session.nodes.length, initialized, flow]);

  useImperativeHandle(
    ref,
    () => ({
      focus: (id: string) => {
        const node = session.nodes.find((n) => n.id === id);
        if (!node) return;
        const { w, h } = nodeLayout(node.partId);
        flow.setCenter(node.x + w / 2, node.y + h / 2, { zoom: Math.max(flow.getZoom(), 0.9), duration: 450 });
      },
      show: (ids: string[]) => {
        // Wait until the new part has been measured, or fitView ignores it.
        let tries = 0;
        const attempt = () => {
          const nodes = ids.map((id) => flow.getInternalNode(id)).filter(Boolean);
          if (nodes.length === ids.length && nodes.every((n) => n!.measured.width)) {
            void flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.18, maxZoom: Math.max(0.6, Math.min(1, flow.getZoom())), duration: 450 });
          } else if (tries++ < 20) window.setTimeout(attempt, 50);
        };
        attempt();
      },
      fit: () => {
        let tries = 0;
        const attempt = () => {
          if (flow.getNodes().every((n) => flow.getInternalNode(n.id)?.measured.width) || tries++ > 20) void flow.fitView({ padding: 0.12, maxZoom: 1.1, duration: 400 });
          else window.setTimeout(attempt, 50);
        };
        attempt();
      },
      center: () => {
        const rect = wrapper.current?.getBoundingClientRect();
        return rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 200, y: 200 };
      },
      toFlow: (screen) => flow.screenToFlowPosition(screen),
    }),
    [flow, session.nodes],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<PartNodeData>>[]) => {
      // Removal goes through the store (with undo), not React Flow's own state.
      const kept = changes.filter((c) => c.type !== "remove");
      if (kept.length) onNodesChangeBase(kept);
    },
    [onNodesChangeBase],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return;
      if (c.source === c.target && c.sourceHandle === c.targetHandle) return;
      const wire = addWire({ node: c.source, pin: c.sourceHandle }, { node: c.target, pin: c.targetHandle });
      if (wire) select([], wire.id);
    },
    [addWire, select],
  );

  // A stable handler: React Flow re-reports its (possibly stale) selection
  // whenever this callback changes identity, which would fight our state.
  const selectionRef = useRef({ nodes: selectedNodes, wire: selectedWire, select });
  selectionRef.current = { nodes: selectedNodes, wire: selectedWire, select };
  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams) => {
    const current = selectionRef.current;
    const ids = ns.map((n) => n.id);
    const wire = ids.length ? null : (es[0]?.id ?? null);
    if (ids.join() === current.nodes.join() && wire === current.wire) return;
    current.select(ids, wire);
  }, []);

  return (
    <div
      ref={wrapper}
      className="hhip-lab-canvas relative h-full w-full"
      data-view={view}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/hhip-part")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        const partId = e.dataTransfer.getData("application/hhip-part");
        if (!partId) return;
        e.preventDefault();
        onDropPart(partId, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={22}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={(_, node, dragged) => {
          for (const n of dragged?.length ? dragged : [node]) moveNode(n.id, n.position.x, n.position.y);
        }}
        onNodesDelete={(ns) => removeNodes(ns.map((n) => n.id))}
        onEdgesDelete={(es) => removeWires(es.map((e) => e.id))}
        deleteKeyCode={["Delete", "Backspace"]}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          openContextMenu({ x: e.clientX, y: e.clientY }, { node: node.id });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          openContextMenu({ x: e.clientX, y: e.clientY }, { wire: edge.id });
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          openContextMenu({ x: e.clientX, y: e.clientY }, { flow: flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }) });
        }}
        onPaneClick={() => select([], null)}
        connectionLineStyle={{ stroke: "var(--primary)", strokeWidth: 2.5, strokeDasharray: "6 5" }}
        snapToGrid
        snapGrid={[8, 8]}
        minZoom={0.2}
        maxZoom={2.5}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={false}
        panOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        fitView={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="var(--canvas-grid)" />
        <Controls showInteractive={false} position="bottom-right" className="!rounded-[10px] !border !border-border !shadow-[var(--shadow-sm)] [&_button]:!border-border [&_button]:!bg-surface [&_button]:!text-foreground [&_svg]:!fill-current" />
        {session.nodes.length >= 3 ? <MiniMap pannable zoomable position="bottom-left" style={{ width: 150, height: 96 }} className="!hidden !rounded-[10px] !border !border-border !bg-surface md:!block" nodeColor={(n) => (getPinout((n.data as PartNodeData).node.partId).controller ? "var(--primary)" : "var(--muted)")} maskColor="color-mix(in srgb, var(--background) 70%, transparent)" /> : null}
      </ReactFlow>
    </div>
  );
});

export const LabCanvas = forwardRef<LabCanvasHandle, { onDropPart: (partId: string, at: { x: number; y: number }) => void }>(function LabCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <Inner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});
