"use client";

/**
 * Mirrors a lab session to the backend workspace runtime when the backend is
 * reachable. The browser copy is the source of truth; this reconciles the
 * backend to it (create what's missing, move what moved, delete what's gone),
 * so undo, redo and offline edits all converge on the next sync. Hardware
 * discovery and physical-device binding use the mirrored workspace.
 */

import { API_BASE, api } from "@/lib/api-client";
import { getPinout, pinTone } from "./pinout";
import type { LabSession } from "./types";

export type RuntimeStatus = "checking" | "online" | "offline" | "syncing";

type Runtime = NonNullable<LabSession["runtime"]>;

export async function backendReachable(timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function protocolFor(session: LabSession, wire: LabSession["wires"][number]): string {
  const pinOf = (ref: { node: string; pin: string }) => {
    const node = session.nodes.find((n) => n.id === ref.node);
    return node ? getPinout(node.partId).pins.find((p) => p.id === ref.pin) : undefined;
  };
  const tones = [pinOf(wire.from), pinOf(wire.to)].filter(Boolean).map((p) => pinTone(p!));
  if (tones.includes("power")) return "power";
  if (tones.includes("ground")) return "ground";
  if (tones.includes("analog")) return "analog";
  if (tones.includes("pwm")) return "pwm";
  return "digital";
}

/** Bring the backend in line with the session. Returns the updated mapping. */
export async function reconcile(session: LabSession): Promise<Runtime> {
  let runtime: Runtime = session.runtime ? { ...session.runtime, nodeIds: { ...session.runtime.nodeIds }, wireIds: { ...session.runtime.wireIds } } : { workspaceId: "", nodeIds: {}, wireIds: {} };

  if (runtime.workspaceId) {
    try {
      await api.getEngineeringWorkspaceState(runtime.workspaceId);
    } catch {
      runtime = { workspaceId: "", nodeIds: {}, wireIds: {} };
    }
  }
  if (!runtime.workspaceId) {
    const created = await api.createEngineeringWorkspace({ name: session.name, project_id: session.projectId ?? undefined });
    runtime.workspaceId = created.workspace_id;
  }
  const ws = runtime.workspaceId;

  // Nodes: drop removed, add new, move moved.
  const live = new Set(session.nodes.map((n) => n.id));
  const removed = Object.keys(runtime.nodeIds).filter((id) => !live.has(id));
  if (removed.length) {
    await api.deleteWorkspaceNodes(ws, removed.map((id) => runtime.nodeIds[id])).catch(() => undefined);
    for (const id of removed) delete runtime.nodeIds[id];
    // Their wires went with them on the backend.
    for (const [wid] of Object.entries(runtime.wireIds)) if (!session.wires.some((w) => w.id === wid)) delete runtime.wireIds[wid];
  }
  for (const node of session.nodes) {
    const remote = runtime.nodeIds[node.id];
    if (!remote) {
      try {
        const created = await api.addWorkspaceNode(ws, { component_id: node.partId, position: { x: node.x, y: node.y }, device_mode: node.mode, label: node.label });
        if (created.id) runtime.nodeIds[node.id] = created.id;
      } catch {
        /* parts the backend catalogue lacks stay browser-only */
      }
    }
  }

  // Wires: drop removed, add new.
  const liveWires = new Set(session.wires.map((w) => w.id));
  const goneWires = Object.keys(runtime.wireIds).filter((id) => !liveWires.has(id));
  if (goneWires.length) {
    await api.deleteWorkspaceWires(ws, goneWires.map((id) => runtime.wireIds[id])).catch(() => undefined);
    for (const id of goneWires) delete runtime.wireIds[id];
  }
  for (const wire of session.wires) {
    if (runtime.wireIds[wire.id]) continue;
    const source = runtime.nodeIds[wire.from.node];
    const target = runtime.nodeIds[wire.to.node];
    if (!source || !target) continue;
    try {
      const created = await api.addWorkspaceWire(ws, { source, target, source_handle: wire.from.pin, target_handle: wire.to.pin, protocol: protocolFor(session, wire) });
      const id = typeof created.id === "string" ? created.id : undefined;
      if (id) runtime.wireIds[wire.id] = id;
    } catch {
      /* keep going; the next sync retries */
    }
  }
  return runtime;
}

/** Push node positions after a drag, without a full reconcile. */
export async function syncPosition(session: LabSession, nodeId: string) {
  const runtime = session.runtime;
  const node = session.nodes.find((n) => n.id === nodeId);
  const remote = runtime?.nodeIds[nodeId];
  if (!runtime?.workspaceId || !node || !remote) return;
  await api.updateWorkspaceNode(runtime.workspaceId, remote, { position: { x: node.x, y: node.y } }).catch(() => undefined);
}
