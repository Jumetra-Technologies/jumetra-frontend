import type { DiscoveredHardwareDevice } from "@/stores/discovery-store";
import type {
  HybridPhysicalDevice,
  HybridPhysicalPin,
  HybridPinConnection,
} from "@/lib/hybrid-types";
import type {
  AnalyticsOverview,
  ComparisonResult,
  ComponentSearchHit,
  ComponentV2Detail,
  ComponentV2SearchHit,
  ControllerSpec,
  HybridExperiment,
  DashboardOverview,
  DeviceDetail,
  DeviceSummary,
  ExperimentDetail,
  ExperimentStatus,
  ExperimentSummary,
  LaboratorySession,
  ProjectDetail,
  ProjectSummary,
  SimulationState,
  SimulationStepResult,
} from "./types";
import type { WorkspaceNode, WorkspaceState } from "./workspace-types";
import { coerceWorkspaceState } from "./workspace-snapshot";
import { recordError, recordRequest } from "./diagnostics/store";
import { getStoredAuthSession } from "./auth-session";
import type {
  ExperimentRecord,
  NewProject,
  ProjectTeammate,
  RoboticsProject,
} from "./robotics-data";

function getStoredAuthSessionSafe(): { access_token?: string } | null {
  return getStoredAuthSession();
}

/** A response the API answered with an error status. `status` lets callers tell "sign in" (401) from "server down". */
export class ApiError extends Error {
  constructor(
    public readonly path: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(`API ${path} failed: ${status}`);
    this.name = "ApiError";
  }
}

/** True when the server refused the request for want of a valid sign-in. */
export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export const PRODUCTION_API_URL = "https://europe-west4-hhipsystemv0.cloudfunctions.net/api";
export const PRODUCTION_WS_URL = "wss://api-aoxa3kagvq-ez.a.run.app";

const DEFAULT_API_BASE =
  process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://127.0.0.1:8000";
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE).replace(/\/+$/, "");
const ENGINEERING_WORKSPACE_REQUEST_TIMEOUT_MS = 15_000;

type UserProjectPayload = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  objectives: string;
  contributors: string;
  category: RoboticsProject["category"];
  hardware: string[];
  teammates: ProjectTeammate[];
  created_at: string | null;
  updated_at: string | null;
};

export type UserSearchResult = ProjectTeammate;

type UserProjectExperimentPayload = {
  id: string;
  project_id: string;
  title: string;
  objective: string;
  hardware: string[];
  procedure: string;
  observations: string;
  results: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

type UserProjectExperimentInput = Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">;

function normalizeUserProjectExperiment(record: UserProjectExperimentPayload): ExperimentRecord {
  const now = new Date().toISOString();
  return {
    id: record.id,
    projectId: record.project_id,
    title: record.title,
    objective: record.objective,
    hardware: record.hardware,
    procedure: record.procedure,
    observations: record.observations,
    results: record.results,
    notes: record.notes,
    createdAt: record.created_at ?? now,
    updatedAt: record.updated_at ?? record.created_at ?? now,
  };
}

function normalizeUserProject(project: UserProjectPayload): RoboticsProject {
  const now = new Date().toISOString();
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    objectives: project.objectives,
    contributors: project.contributors,
    category: project.category,
    hardware: project.hardware,
    teammates: project.teammates ?? [],
    createdAt: project.created_at ?? now,
    updatedAt: project.updated_at ?? project.created_at ?? now,
  };
}

function serializeUserProject(project: NewProject) {
  return {
    name: project.name,
    description: project.description,
    objectives: project.objectives,
    contributors: project.contributors,
    category: project.category,
    hardware: project.hardware,
    teammate_ids: (project.teammates ?? []).map((teammate) => teammate.id),
  };
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

/** Every browser request goes to System Diagnostics: its time and status, and failures as errors. */
async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  if (typeof window === "undefined") return fetchJsonRaw<T>(path, init, timeoutMs);
  const started = performance.now();
  const method = init?.method ?? "GET";
  try {
    const result = await fetchJsonRaw<T>(path, init, timeoutMs);
    recordRequest({ method, path, status: 200, ms: Math.round(performance.now() - started) });
    return result;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : /timed out/.test(String((err as Error)?.message)) ? -1 : 0;
    recordRequest({ method, path, status, ms: Math.round(performance.now() - started) });
    // A missing sign-in is expected, not a fault.
    if (status !== 401 && status !== 403) {
      const entry = recordError({ source: "request", message: err instanceof Error ? err.message : String(err), detail: `${method} ${path}${err instanceof ApiError && err.detail ? `: ${err.detail}` : ""}` });
      // So the screen that shows this error adds what it told the person, instead of logging it twice.
      if (err && typeof err === "object") (err as Record<symbol, string>)[Symbol.for("kiungo.diagnostics.id")] = entry.id;
    }
    throw err;
  }
}

async function fetchJsonRaw<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const session = typeof window !== "undefined" ? getStoredAuthSessionSafe() : null;
  const headers = new Headers(init?.headers ?? undefined);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init?.method && init.method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = timeoutMs ? new AbortController() : undefined;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  const fetchInit: RequestInit = {
    ...init,
    headers,
    ...(controller ? { signal: controller.signal } : {}),
  };
  // Next.js cache hints are server-only; omit in the browser to avoid fetch failures.
  if (typeof window === "undefined" && !init?.method) {
    (fetchInit as RequestInit & { next?: { revalidate: number } }).next = { revalidate: 10 };
  }
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, fetchInit);
    } catch (err) {
      if (controller?.signal.aborted) {
        throw new Error(`API ${path} timed out after ${timeoutMs} ms.`);
      }
      const hint =
        typeof window !== "undefined"
          ? `Cannot reach the Kiungo API at ${API_BASE}. Check that the backend is running and that NEXT_PUBLIC_API_URL is correct.`
          : "";
      const message = err instanceof Error ? err.message : "Network error";
      throw new Error(hint ? `${message}. ${hint}` : message);
    }
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { detail?: unknown } | null;
      throw new ApiError(path, res.status, typeof payload?.detail === "string" ? payload.detail : undefined);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new Error(`API ${path} timed out after ${timeoutMs} ms.`);
    }
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchWorkspaceState(
  path: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<WorkspaceState> {
  const raw = await fetchJson<unknown>(path, init, timeoutMs);
  return coerceWorkspaceState(raw);
}

function coerceWorkspaceNode(raw: unknown): WorkspaceNode {
  const n = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const position = (n.position && typeof n.position === "object" ? n.position : {}) as {
    x?: number;
    y?: number;
  };
  return {
    id: String(n.id ?? ""),
    component_id: String(n.component_id ?? ""),
    label: String(n.label ?? n.component_id ?? ""),
    category: String(n.category ?? ""),
    position: { x: Number(position.x ?? 0), y: Number(position.y ?? 0) },
    device_mode: (n.device_mode as WorkspaceNode["device_mode"]) || "virtual",
    pin_map: (n.pin_map as Record<string, string>) || {},
    properties: (n.properties as Record<string, unknown>) || {},
    live_state: (n.live_state as Record<string, unknown>) || {},
    available: n.available !== false,
    type: n.type ? String(n.type) : undefined,
  };
}

/** Platform-wide numbers for System Diagnostics. The backend serves these to admins only (docs/system-diagnostics.md). */
export interface AdminStats {
  registered_users: number;
  online_users: number;
  signups_7d?: number;
  active_users_24h?: number;
  top_pages?: Array<{ path: string; views: number }>;
}

export const api = {
  /** The backend's liveness check. */
  getHealth: () => fetchJson<{ status: string; version?: string }>("/health", undefined, 8000),
  getAdminStats: () => fetchJson<AdminStats>("/admin/stats", undefined, 8000),
  getDashboardOverview: () => fetchJson<DashboardOverview>("/analytics/dashboard"),
  getExperiments: () => fetchJson<ExperimentSummary[]>("/experiments"),
  getExperiment: (id: string) => fetchJson<ExperimentDetail>(`/experiments/${id}`),
  getExperimentStatus: (id: string) => fetchJson<ExperimentStatus>(`/experiments/${id}/status`),
  startExperiment: (body: {
    name: string;
    devices?: string[];
    strategy?: string;
    duration_ms?: number;
    sync_interval_ms?: number;
  }) =>
    fetchJson<ExperimentStatus>("/experiments/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pauseExperiment: (id: string) =>
    fetchJson<ExperimentStatus>(`/experiments/${id}/pause`, { method: "POST" }),
  stopExperiment: (id: string) =>
    fetchJson<ExperimentStatus>(`/experiments/${id}/stop`, { method: "POST" }),
  getDevices: () => fetchJson<DeviceSummary[]>("/devices"),
  getDevice: (id: string) => fetchJson<DeviceDetail>(`/devices/${id}`),
  getAnalytics: () => fetchJson<AnalyticsOverview>("/analytics"),
  getComparison: () => fetchJson<ComparisonResult>("/analytics/comparison"),
  getProjects: () => fetchJson<ProjectSummary[]>("/workspace/projects"),
  getProject: (id: string) => fetchJson<ProjectDetail>(`/workspace/projects/${id}`),
  getMyProjects: async () => (await fetchJson<UserProjectPayload[]>("/auth/me/projects")).map(normalizeUserProject),
  getMyProject: async (id: string) => normalizeUserProject(await fetchJson<UserProjectPayload>(`/auth/me/projects/${encodeURIComponent(id)}`)),
  searchUsers: (query: string) =>
    fetchJson<UserSearchResult[]>(`/auth/users/search${buildQuery({ q: query })}`),
  getMyProjectExperiments: async (projectId: string) =>
    (await fetchJson<UserProjectExperimentPayload[]>(`/auth/me/projects/${encodeURIComponent(projectId)}/experiments`))
      .map(normalizeUserProjectExperiment),
  createMyProjectExperiment: async (projectId: string, record: UserProjectExperimentInput) =>
    normalizeUserProjectExperiment(await fetchJson<UserProjectExperimentPayload>(
      `/auth/me/projects/${encodeURIComponent(projectId)}/experiments`,
      {
        method: "POST",
        body: JSON.stringify({
          title: record.title,
          objective: record.objective,
          hardware: record.hardware,
          procedure: record.procedure,
          observations: record.observations,
          results: record.results,
          notes: record.notes,
        }),
      },
    )),
  updateMyProjectExperiment: async (projectId: string, recordId: string, record: UserProjectExperimentInput) =>
    normalizeUserProjectExperiment(await fetchJson<UserProjectExperimentPayload>(
      `/auth/me/projects/${encodeURIComponent(projectId)}/experiments/${encodeURIComponent(recordId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: record.title,
          objective: record.objective,
          hardware: record.hardware,
          procedure: record.procedure,
          observations: record.observations,
          results: record.results,
          notes: record.notes,
        }),
      },
    )),
  deleteMyProjectExperiment: (projectId: string, recordId: string) =>
    fetchJson<{ deleted: boolean }>(
      `/auth/me/projects/${encodeURIComponent(projectId)}/experiments/${encodeURIComponent(recordId)}`,
      { method: "DELETE" },
    ),
  createMyProject: async (project: NewProject) =>
    normalizeUserProject(await fetchJson<UserProjectPayload>("/auth/me/projects", { method: "POST", body: JSON.stringify(serializeUserProject(project)) })),
  updateMyProject: async (id: string, project: NewProject) =>
    normalizeUserProject(await fetchJson<UserProjectPayload>(`/auth/me/projects/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(serializeUserProject(project)) })),
  deleteMyProject: (id: string) =>
    fetchJson<{ deleted: boolean }>(`/auth/me/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  searchComponents: (
    params: {
      q?: string;
      category?: string;
      interface?: string;
      controller_id?: string;
      limit?: number;
    },
    timeoutMs?: number,
  ) =>
    fetchJson<ComponentSearchHit[]>(
      `/components/search${buildQuery({
        q: params.q,
        category: params.category,
        interface: params.interface,
        controller_id: params.controller_id,
        limit: params.limit,
      })}`,
      undefined,
      timeoutMs,
    ),
  debugComponents: () =>
    fetchJson<{
      total_components: number;
      categories: string[];
      sample_components: Array<Record<string, unknown>>;
      components_dir?: string;
      json_catalog_count?: number;
    }>("/components/debug"),
  searchComponentsV2: (params: { q?: string; category?: string; interface?: string; limit?: number }) =>
    fetchJson<{ results: ComponentV2SearchHit[]; total: number }>(
      `/components/v2/search${buildQuery({
        q: params.q,
        category: params.category,
        interface: params.interface,
        limit: params.limit,
      })}`,
    ),
  getComponentV2: (id: string) => fetchJson<ComponentV2Detail>(`/components/v2/${id}`),
  getComponentV2RendererUrl: (id: string) => `${API_BASE}/components/v2/${id}/renderer.svg`,
  debugComponentsV2: () =>
    fetchJson<{
      total_packages: number;
      categories: string[];
      renderers: string[];
      packages_dir: string;
      sample: string[];
    }>("/components/v2/debug"),
  createComponentV2Binding: (body: {
    component_id: string;
    instance_id?: string;
    mode?: string;
    transport?: string;
    device_id?: string;
    port?: string;
  }) =>
    fetchJson<Record<string, unknown>>("/components/v2/bindings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  switchComponentV2Binding: (
    instanceId: string,
    body: { mode: string; device_id?: string; transport?: string; port?: string },
  ) =>
    fetchJson<Record<string, unknown>>(`/components/v2/bindings/${instanceId}/mode`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  simulateComponentV2: (
    id: string,
    body?: { instance_id?: string; t_s?: number; inputs?: Record<string, unknown> },
  ) =>
    fetchJson<{ signal: Record<string, unknown> }>(`/components/v2/${id}/simulate`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  getComponent: (id: string) =>
    fetchJson<{ component: ComponentSearchHit["component"]; compatibility: Array<Record<string, unknown>> }>(
      `/components/${id}`,
    ),
  getControllers: () => fetchJson<ControllerSpec[]>("/controllers"),
  createLaboratory: (body: {
    name: string;
    controller_id: string;
    component_ids: string[];
    description?: string;
  }) =>
    fetchJson<LaboratorySession>("/laboratory/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  startLaboratory: (id: string) =>
    fetchJson<{ status: string; laboratory: LaboratorySession; state?: SimulationState }>(
      `/laboratory/${id}/start`,
      { method: "POST" },
    ),
  getLaboratory: (id: string) => fetchJson<LaboratorySession>(`/laboratory/${id}`),
  getSimulation: (id: string) => fetchJson<SimulationState>(`/laboratory/${id}/simulation`),
  pauseSimulation: (id: string) =>
    fetchJson<{ status: string; state: SimulationState }>(`/laboratory/${id}/simulation/pause`, {
      method: "POST",
    }),
  stopSimulation: (id: string) =>
    fetchJson<{ status: string; state: SimulationState }>(`/laboratory/${id}/simulation/stop`, {
      method: "POST",
    }),
  advanceSimulation: (id: string, deltaMs = 100) =>
    fetchJson<SimulationStepResult>(`/laboratory/${id}/simulation/advance`, {
      method: "POST",
      body: JSON.stringify({ delta_ms: deltaMs }),
    }),
  sendActuatorCommand: (
    laboratoryId: string,
    instanceId: string,
    action: string,
    value?: unknown,
  ) =>
    fetchJson<Record<string, unknown>>(`/laboratory/${laboratoryId}/simulation/command`, {
      method: "POST",
      body: JSON.stringify({ instance_id: instanceId, action, value }),
    }),
  createHybridExperiment: (body: {
    name: string;
    controller_id: string;
    component_ids: string[];
    device_modes?: Record<string, string>;
    physical_device_id?: string;
    simulator_backend?: string;
  }) =>
    fetchJson<HybridExperiment>("/hybrid/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listHybridExperiments: () => fetchJson<HybridExperiment[]>("/hybrid/"),
  getHybridExperiment: (id: string) => fetchJson<Record<string, unknown>>(`/hybrid/${id}`),
  startHybridExperiment: (id: string) =>
    fetchJson<{ status: string; state: Record<string, unknown> }>(`/hybrid/${id}/start`, {
      method: "POST",
    }),
  advanceHybridExperiment: (id: string, deltaMs = 100) =>
    fetchJson<{ status: string; state: Record<string, unknown> }>(`/hybrid/${id}/advance`, {
      method: "POST",
      body: JSON.stringify({ delta_ms: deltaMs }),
    }),
  stopHybridExperiment: (id: string) =>
    fetchJson<{ status: string; state: Record<string, unknown> }>(`/hybrid/${id}/stop`, {
      method: "POST",
    }),
  listHybridPhysicalDevices: () =>
    fetchJson<{ devices: HybridPhysicalDevice[]; count: number }>("/hybrid/devices"),
  connectHybridPhysicalDevice: (body: {
    port?: string;
    endpoint?: string;
    board_type?: string;
    device_id?: string;
    label?: string;
    transport?: string;
    username?: string;
  }) =>
    fetchJson<HybridPhysicalDevice>("/hybrid/devices/connect", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listHybridHardwareProfiles: () =>
    fetchJson<{ profiles: Array<Record<string, unknown>>; count: number }>("/hybrid/profiles"),
  getHybridPhysicalPins: (deviceId: string) =>
    fetchJson<{ device_id: string; pins: HybridPhysicalPin[]; count: number }>(
      `/hybrid/devices/${encodeURIComponent(deviceId)}/pins`,
    ),
  listHybridConnections: () =>
    fetchJson<{ connections: HybridPinConnection[]; count: number }>("/hybrid/connections"),
  createHybridConnection: (body: {
    virtual_node_id: string;
    virtual_pin_id: string;
    physical_device_id: string;
    physical_pin_id: string;
    workspace_id?: string;
  }) =>
    fetchJson<HybridPinConnection>("/hybrid/connections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getWorkspaceCatalog: (params?: {
    q?: string;
    category?: string;
    interface?: string;
    interfaces?: string;
    voltage?: string | number;
    voltages?: string;
    controller_id?: string;
  }) =>
    fetchJson<{ categories: string[]; items: Array<Record<string, unknown>> }>(
      `/engineering/workspace/catalog${buildQuery({
        q: params?.q,
        category: params?.category,
        interface: params?.interface,
        interfaces: params?.interfaces,
        voltage: params?.voltage,
        voltages: params?.voltages,
        controller_id: params?.controller_id,
      })}`,
    ),
  createEngineeringWorkspace: (body: { name: string; project_id?: string }) =>
    fetchJson<{ workspace_id: string; name: string; status: string }>("/engineering/workspace", {
      method: "POST",
      body: JSON.stringify(body),
    }, ENGINEERING_WORKSPACE_REQUEST_TIMEOUT_MS),
  getEngineeringWorkspaceState: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/state`),
  connectEngineeringWorkspace: (id: string) =>
    fetchWorkspaceState(
      `/engineering/workspace/${id}/connect`,
      { method: "POST" },
      ENGINEERING_WORKSPACE_REQUEST_TIMEOUT_MS,
    ),
  disconnectEngineeringWorkspace: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/disconnect`, { method: "POST" }),
  runEngineeringWorkspace: (id: string, speed = "1x") =>
    fetchWorkspaceState(`/engineering/workspace/${id}/run`, {
      method: "POST",
      body: JSON.stringify({ speed }),
    }),
  pauseEngineeringWorkspace: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/pause`, { method: "POST" }),
  resetEngineeringWorkspace: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/reset`, { method: "POST" }),
  stepEngineeringWorkspace: (id: string, deltaMs = 100) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/step`, {
      method: "POST",
      body: JSON.stringify({ delta_ms: deltaMs }),
    }),
  addWorkspaceNode: (
    id: string,
    body: {
      component_id: string;
      position: { x: number; y: number };
      device_mode?: string;
      physical_port?: string;
      physical_device_id?: string;
      available?: boolean;
      label?: string;
    },
  ) =>
    fetchJson<unknown>(`/engineering/workspace/${id}/nodes`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then(coerceWorkspaceNode),
  updateWorkspaceNode: (id: string, nodeId: string, patch: Record<string, unknown>) =>
    fetchJson<unknown>(`/engineering/workspace/${id}/nodes/${nodeId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then(coerceWorkspaceNode),
  deleteWorkspaceNodes: async (id: string, ids: string[]) => {
    await fetchJson<unknown>(`/engineering/workspace/${id}/nodes/delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    return fetchWorkspaceState(`/engineering/workspace/${id}/state`);
  },
  duplicateWorkspaceNodes: async (id: string, ids: string[]) => {
    const nodes = await fetchJson<unknown[]>(`/engineering/workspace/${id}/nodes/duplicate`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    return nodes.map(coerceWorkspaceNode);
  },
  addWorkspaceWire: (
    id: string,
    body: {
      source: string;
      target: string;
      source_handle?: string;
      target_handle?: string;
      protocol?: string;
      voltage_v?: number;
    },
  ) =>
    fetchJson<Record<string, unknown>>(`/engineering/workspace/${id}/wires`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteWorkspaceWires: async (id: string, ids: string[]) => {
    await fetchJson<unknown>(`/engineering/workspace/${id}/wires/delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    return fetchWorkspaceState(`/engineering/workspace/${id}/state`);
  },
  undoWorkspace: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/undo`, { method: "POST" }),
  redoWorkspace: (id: string) =>
    fetchWorkspaceState(`/engineering/workspace/${id}/redo`, { method: "POST" }),
  sendWorkspaceSerial: (id: string, line: string) =>
    fetchJson<Record<string, unknown>>(`/engineering/workspace/${id}/serial`, {
      method: "POST",
      body: JSON.stringify({ line }),
    }),
  listDiscoveredDevices: () =>
    fetchJson<{ devices: DiscoveredHardwareDevice[]; count: number }>("/discovery/devices"),
  scanDiscovery: () =>
    fetchJson<{ devices: DiscoveredHardwareDevice[]; count: number }>("/discovery/scan", {
      method: "POST",
    }),
  uploadDiscoveryFirmware: (port: string, firmwarePath = "") =>
    fetchJson<Record<string, unknown>>("/discovery/firmware/upload", {
      method: "POST",
      body: JSON.stringify({ port, firmware_path: firmwarePath }),
    }),
  listWorkspaceHardware: (workspaceId = "") =>
    fetchJson<{ hardware: Array<Record<string, unknown>>; count: number }>(
      `/workspace/hardware${buildQuery({ workspace_id: workspaceId || undefined })}`,
    ),
  getWorkspaceHardware: (deviceId: string) =>
    fetchJson<Record<string, unknown>>(`/workspace/hardware/${encodeURIComponent(deviceId)}`),
  reconnectWorkspaceHardware: (body: { device_id?: string; project_id?: string }) =>
    fetchJson<Record<string, unknown>>("/workspace/hardware/reconnect", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  disconnectWorkspaceHardware: (deviceId: string) =>
    fetchJson<Record<string, unknown>>("/workspace/hardware/disconnect", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId }),
    }),
  listWorkspaceHardwareEvents: (limit = 100) =>
    fetchJson<{ events: Array<Record<string, unknown>>; count: number }>(
      `/workspace/hardware/events${buildQuery({ limit })}`,
    ),
  listWorkspaceConnections: (workspaceId = "") =>
    fetchJson<{ connections: Array<Record<string, unknown>>; count: number }>(
      `/workspace/connections${buildQuery({ workspace_id: workspaceId || undefined })}`,
    ),
  getWorkspaceConnection: (id: string) =>
    fetchJson<Record<string, unknown>>(`/workspace/connections/${encodeURIComponent(id)}`),
  createWorkspaceConnection: (body: Record<string, unknown>) =>
    fetchJson<Record<string, unknown>>("/workspace/connections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteWorkspaceConnection: (id: string) =>
    fetchJson<Record<string, unknown>>(`/workspace/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  patchWorkspaceConnection: (id: string, patch: Record<string, unknown>) =>
    fetchJson<Record<string, unknown>>(`/workspace/connections/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  previewWorkspaceConnection: (body: Record<string, unknown>) =>
    fetchJson<Record<string, unknown>>("/workspace/connections/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  highlightWorkspacePath: (body: {
    start_device: string;
    start_pin: string;
    end_device: string;
    end_pin: string;
  }) =>
    fetchJson<{ path?: string[] } & Record<string, unknown>>("/workspace/connections/highlight", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  writeWorkspacePin: (body: {
    device_id: string;
    pin: string;
    value: unknown;
    mode?: string;
    virtual_node_id?: string;
  }) =>
    fetchJson<Record<string, unknown>>("/workspace/connections/pin-write", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setWorkspacePinMode: (body: { device_id: string; pin: string; mode: string }) =>
    fetchJson<Record<string, unknown>>("/workspace/connections/pin-mode", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  inspectWorkspacePin: (deviceId: string, pin: string) =>
    fetchJson<Record<string, unknown>>(
      `/workspace/connections/pin/${encodeURIComponent(deviceId)}/${encodeURIComponent(pin)}`,
    ),
  listFirmwareProjects: (timeoutMs?: number) =>
    fetchJson<{ projects: Array<Record<string, unknown>>; count: number }>("/firmware/projects", undefined, timeoutMs),
  createFirmwareProject: (body: Record<string, unknown>) =>
    fetchJson<Record<string, unknown>>("/firmware/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getFirmwareProject: (id: string) =>
    fetchJson<Record<string, unknown>>(`/firmware/projects/${encodeURIComponent(id)}`),
  saveFirmwareFile: (id: string, body: { path: string; content: string }) =>
    fetchJson<Record<string, unknown>>(`/firmware/projects/${encodeURIComponent(id)}/files`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  listFirmwareTemplates: (timeoutMs?: number) =>
    fetchJson<{ templates: Array<Record<string, unknown>>; count: number }>("/firmware/templates", undefined, timeoutMs),
  listFirmwareToolchains: () =>
    fetchJson<{
      toolchains: Array<Record<string, unknown>>;
      missing: Array<Record<string, unknown>>;
      count: number;
    }>("/firmware/toolchains"),
  buildFirmware: (body: { project_id: string; use_cache?: boolean }) =>
    fetchJson<Record<string, unknown>>("/firmware/build", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  queueFirmwareBuild: (body: { project_id: string; use_cache?: boolean }) =>
    fetchJson<{
      job_id: string;
      job_type: string;
      status: "queued" | "running" | "succeeded" | "failed";
      result?: unknown;
      error?: string | null;
    }>("/firmware/build/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getBackgroundJob: (jobId: string) =>
    fetchJson<{
      job_id: string;
      job_type: string;
      status: "queued" | "running" | "succeeded" | "failed";
      result?: unknown;
      error?: string | null;
    }>(`/jobs/${encodeURIComponent(jobId)}`),
  uploadFirmware: (body: { project_id: string; port?: string; build_id?: string }) =>
    fetchJson<Record<string, unknown>>("/firmware/upload", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getFirmwareLogs: (limit = 200) =>
    fetchJson<{ logs: Array<Record<string, unknown>>; count: number }>(
      `/firmware/logs${buildQuery({ limit })}`,
    ),
  getFirmwareSerial: (params?: { limit?: number; query?: string }) =>
    fetchJson<Record<string, unknown>>(
      `/firmware/serial${buildQuery({ limit: params?.limit, query: params?.query })}`,
    ),
  postFirmwareSerial: (body: Record<string, unknown>) =>
    fetchJson<Record<string, unknown>>("/firmware/serial", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

function wsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_WS_URL;
  }
  return API_BASE.replace(/^http/, "ws");
}

export function wsUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${wsBase()}${suffix}`;
}

export function getWsUrl(): string {
  return wsUrl("/ws/events");
}

export function getWorkspaceWsUrl(workspaceId: string): string {
  return wsUrl(`/ws/workspace/${workspaceId}`);
}

export function getDiscoveryWsUrl(): string {
  return wsUrl("/ws/discovery");
}

export function getHardwareWsUrl(): string {
  return wsUrl("/ws/hardware");
}

export function getWiringWsUrl(): string {
  return wsUrl("/ws/wiring");
}

export function getFirmwareWsUrl(): string {
  return wsUrl("/ws/firmware");
}
