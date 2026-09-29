export const ROBOTICS_DATA_KEY = "hhip-robotics-workspace:v1";

export type ProjectCategory = "robotics" | "embedded" | "autonomy" | "iot" | "other";

export type RoboticsProject = {
  id: string;
  name: string;
  description: string;
  objectives: string;
  contributors: string;
  category: ProjectCategory;
  hardware: string[];
  createdAt: string;
  updatedAt: string;
};

export type ExperimentRecord = {
  id: string;
  projectId: string;
  title: string;
  objective: string;
  hardware: string[];
  procedure: string;
  observations: string;
  results: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RoboticsWorkspaceData = {
  projects: RoboticsProject[];
  experiments: ExperimentRecord[];
};

export type NewProject = Omit<RoboticsProject, "id" | "createdAt" | "updatedAt">;
export type NewExperiment = Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">;

export const EMPTY_ROBOTICS_DATA: RoboticsWorkspaceData = {
  projects: [],
  experiments: [],
};

let cachedSerialized: string | null = null;
let cachedData = EMPTY_ROBOTICS_DATA;
const listeners = new Set<() => void>();

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProjectRecord(
  input: NewProject,
  now = new Date().toISOString(),
): RoboticsProject {
  return { ...input, id: createId("local-project"), createdAt: now, updatedAt: now };
}

export function createExperimentRecord(
  input: NewExperiment,
  now = new Date().toISOString(),
): ExperimentRecord {
  return { ...input, id: createId("record"), createdAt: now, updatedAt: now };
}

export function readRoboticsData(): RoboticsWorkspaceData {
  if (typeof window === "undefined") return EMPTY_ROBOTICS_DATA;

  try {
    const serialized = window.localStorage.getItem(ROBOTICS_DATA_KEY) ?? "null";
    if (serialized === cachedSerialized) return cachedData;
    cachedSerialized = serialized;
    const parsed = JSON.parse(serialized) as
      | Partial<RoboticsWorkspaceData>
      | null;
    cachedData = {
      projects: Array.isArray(parsed?.projects) ? parsed.projects : [],
      experiments: Array.isArray(parsed?.experiments) ? parsed.experiments : [],
    };
    return cachedData;
  } catch {
    cachedSerialized = null;
    cachedData = EMPTY_ROBOTICS_DATA;
    return cachedData;
  }
}

export function getServerRoboticsDataSnapshot(): null {
  return null;
}

export function subscribeToRoboticsData(listener: () => void): () => void {
  listeners.add(listener);
  const handleStorage = () => {
    cachedSerialized = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", handleStorage);
  };
}

export function writeRoboticsData(data: RoboticsWorkspaceData): boolean {
  if (typeof window === "undefined") return false;

  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(ROBOTICS_DATA_KEY, serialized);
    cachedSerialized = serialized;
    cachedData = data;
    listeners.forEach((listener) => listener());
    return true;
  } catch {
    return false;
  }
}

export function formatExperimentReport(
  experiment: ExperimentRecord,
  project?: RoboticsProject,
): string {
  return [
    `# ${experiment.title}`,
    "",
    `Project: ${project?.name ?? "Unassigned"}`,
    `Recorded: ${new Date(experiment.updatedAt).toLocaleString()}`,
    "",
    "## Objective",
    experiment.objective || "Not recorded.",
    "",
    "## Hardware",
    experiment.hardware.length ? experiment.hardware.map((item) => `- ${item}`).join("\n") : "Not recorded.",
    "",
    "## Procedure",
    experiment.procedure || "Not recorded.",
    "",
    "## Observations",
    experiment.observations || "Not recorded.",
    "",
    "## Results",
    experiment.results || "Not recorded.",
    "",
    "## Notes",
    experiment.notes || "None.",
    "",
  ].join("\n");
}