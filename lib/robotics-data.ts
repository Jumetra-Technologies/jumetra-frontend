export const ROBOTICS_DATA_KEY = "hhip-robotics-workspace:v1";

export type ProjectCategory = "robotics" | "embedded" | "autonomy" | "iot" | "other";

export type ProjectTeammate = {
  id: string;
  display_name: string;
  email: string;
};

export type RoboticsProject = {
  id: string;
  name: string;
  description: string;
  objectives: string;
  contributors: string;
  category: ProjectCategory;
  hardware: string[];
  teammates?: ProjectTeammate[];
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

let cachedData = EMPTY_ROBOTICS_DATA;
const listeners = new Set<() => void>();

function clearLegacyWorkspaceData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ROBOTICS_DATA_KEY);
  } catch (error) {
    console.error("Could not clear previously stored workspace data.", error);
  }
}

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
  clearLegacyWorkspaceData();
  return cachedData;
}

export function getServerRoboticsDataSnapshot(): null {
  return null;
}

export function subscribeToRoboticsData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function writeRoboticsData(data: RoboticsWorkspaceData): boolean {
  clearLegacyWorkspaceData();
  cachedData = data;
  listeners.forEach((listener) => listener());
  return true;
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