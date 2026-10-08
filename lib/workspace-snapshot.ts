import type { WorkspaceNode, WorkspaceState, WorkspaceWire } from "@/lib/workspace-types";

/**
 * Normalises a backend engineering-workspace state payload. The Engineering
 * Lab keeps its own sessions in the browser (lib/lab) and mirrors them to the
 * backend; this is only used to read the backend's responses safely.
 */
export function coerceWorkspaceState(raw: unknown): WorkspaceState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const canvas = (s.canvas && typeof s.canvas === "object" ? s.canvas : {}) as Record<string, unknown>;
  const nodes = Array.isArray(canvas.nodes) ? (canvas.nodes as WorkspaceNode[]) : [];
  const edges = Array.isArray(canvas.edges) ? (canvas.edges as WorkspaceWire[]) : [];
  return {
    workspace_id: String(s.workspace_id ?? ""),
    name: String(s.name ?? ""),
    status: String(s.status ?? "created"),
    speed: String(s.speed ?? "1x"),
    sim_time_ms: Number(s.sim_time_ms ?? 0),
    tick_count: Number(s.tick_count ?? 0),
    events_per_sec: Number(s.events_per_sec ?? 0),
    fps: Number(s.fps ?? 0),
    canvas: { nodes, edges },
    console: Array.isArray(s.console) ? (s.console as WorkspaceState["console"]) : [],
    serial: Array.isArray(s.serial) ? (s.serial as WorkspaceState["serial"]) : [],
    events: Array.isArray(s.events) ? (s.events as WorkspaceState["events"]) : [],
    gpio_samples: Array.isArray(s.gpio_samples) ? (s.gpio_samples as WorkspaceState["gpio_samples"]) : [],
    adc_samples: Array.isArray(s.adc_samples) ? (s.adc_samples as WorkspaceState["adc_samples"]) : [],
    devices: Array.isArray(s.devices) ? (s.devices as WorkspaceNode[]) : nodes,
    inspector: (s.inspector as WorkspaceState["inspector"]) ?? undefined,
  };
}
