"use client";

/**
 * The projects and experiment records the person at this browser can use.
 *
 * Signed in, they are the account's: read from and written to the server.
 * Signed out, they are unsaved: kept in this tab's memory only, so everything
 * works and nothing is stored, and closing or reloading the page discards
 * them. Signing in saves the unsaved ones to the account (`saveUnsaved`).
 *
 * The list lives in lib/robotics-data's store, so the Projects page, a
 * project's own page, the Experiments journal and the lab's "Link to project"
 * all see the same projects. An unsaved project is one whose id starts with
 * "local-project-". The store's `experiments` are the records that are not on
 * the server: those of unsaved projects, and any that couldn't be saved with
 * their project. An account project's saved records are read from the server.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLab } from "@kiungo/lab/store";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  EMPTY_ROBOTICS_DATA,
  createExperimentRecord,
  createProjectRecord,
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
  writeRoboticsData,
  type ExperimentRecord,
  type NewExperiment,
  type NewProject,
  type RoboticsProject,
} from "@/lib/robotics-data";

export const UNSAVED_PROJECT_PREFIX = "local-project-";

/** A project that exists in this tab only: made signed out, or not yet saved to the account. */
export function isUnsavedProject(id: string): boolean {
  return id.startsWith(UNSAVED_PROJECT_PREFIX);
}

/** Whose projects are loaded: an account id, or null for nobody (signed out). */
type Status = { account: string | null; ready: boolean; loading: boolean; error: unknown; saving: boolean; unsavedError: unknown };

let status: Status = { account: null, ready: true, loading: false, error: null, saving: false, unsavedError: null };
const statusListeners = new Set<() => void>();
/** Where an unsaved project went when it was saved: its old id to its id on the account. */
const moved = new Map<string, string>();

function setStatus(next: Partial<Status>): void {
  status = { ...status, ...next };
  statusListeners.forEach((listener) => listener());
}

function subscribeToStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

const readStatus = () => status;

/** The id an unsaved project has now, if signing in has saved it since. */
export function movedProjectId(id: string): string | undefined {
  return moved.get(id);
}

const byNewest = (a: RoboticsProject, b: RoboticsProject) => b.updatedAt.localeCompare(a.updatedAt);

function setProjects(update: (projects: RoboticsProject[]) => RoboticsProject[]): void {
  const data = readRoboticsData();
  writeRoboticsData({ ...data, projects: update(data.projects) });
}

function setExperiments(update: (experiments: ExperimentRecord[]) => ExperimentRecord[]): void {
  const data = readRoboticsData();
  writeRoboticsData({ ...data, experiments: update(data.experiments) });
}

/** Load the signed-in account's projects, keeping any that are still unsaved. */
export async function loadAccountProjects(): Promise<void> {
  const account = status.account;
  if (!account) return;
  setStatus({ loading: true });
  try {
    const saved = await api.getMyProjects();
    if (status.account !== account) return;
    setProjects((projects) => [...projects.filter((project) => isUnsavedProject(project.id)), ...saved]);
    setStatus({ ready: true, loading: false, error: null });
  } catch (error) {
    if (status.account !== account) return;
    setStatus({ ready: true, loading: false, error });
  }
}

/**
 * Create a project: on the account when signed in, otherwise unsaved. A
 * signed-out project can't carry teammates, who are other accounts.
 */
export async function createProject(input: NewProject): Promise<RoboticsProject> {
  if (status.account) {
    const project = await api.createMyProject(input);
    setProjects((projects) => [project, ...projects.filter((item) => item.id !== project.id)]);
    return project;
  }
  const project = createProjectRecord({ ...input, teammates: [] });
  setProjects((projects) => [project, ...projects]);
  return project;
}

export async function updateProject(project: RoboticsProject): Promise<RoboticsProject> {
  const saved = isUnsavedProject(project.id) ? { ...project, updatedAt: new Date().toISOString() } : await api.updateMyProject(project.id, project);
  setProjects((projects) => projects.map((item) => (item.id === saved.id ? saved : item)));
  return saved;
}

/** Delete a project and its records. Its lab sessions stay, unlinked. */
export async function deleteProject(id: string): Promise<void> {
  if (!isUnsavedProject(id)) await api.deleteMyProject(id);
  setProjects((projects) => projects.filter((item) => item.id !== id));
  setExperiments((experiments) => experiments.filter((record) => record.projectId !== id));
  const lab = useLab.getState();
  for (const session of lab.sessions) if (session.projectId === id) lab.linkProject(session.id, null);
}

const unsavedRecordsOf = (projectId: string) => readRoboticsData().experiments.filter((record) => record.projectId === projectId);
const isUnsavedRecord = (id: string) => readRoboticsData().experiments.some((record) => record.id === id);

/** A project's experiment records: the ones not saved yet, then the account's. */
export async function listRecords(projectId: string): Promise<ExperimentRecord[]> {
  if (isUnsavedProject(projectId)) return unsavedRecordsOf(projectId);
  const saved = await api.getMyProjectExperiments(projectId);
  return [...unsavedRecordsOf(projectId), ...saved];
}

export async function saveRecord(input: NewExperiment, existing?: ExperimentRecord): Promise<ExperimentRecord> {
  // A form opened before signing in still names the project by the id it had then.
  const draft = { ...input, projectId: moved.get(input.projectId) ?? input.projectId };
  if (isUnsavedProject(draft.projectId)) {
    const now = new Date().toISOString();
    const record = existing ? { ...existing, ...draft, updatedAt: now } : createExperimentRecord(draft, now);
    setExperiments((experiments) => [record, ...experiments.filter((item) => item.id !== record.id)]);
    return record;
  }
  // A record that never reached the server is created there now, and its unsaved copy dropped.
  if (existing && isUnsavedRecord(existing.id)) {
    const saved = await api.createMyProjectExperiment(draft.projectId, draft);
    setExperiments((experiments) => experiments.filter((item) => item.id !== existing.id));
    return saved;
  }
  return existing ? api.updateMyProjectExperiment(existing.projectId, existing.id, draft) : api.createMyProjectExperiment(draft.projectId, draft);
}

export async function deleteRecord(record: ExperimentRecord): Promise<void> {
  if (isUnsavedRecord(record.id)) setExperiments((experiments) => experiments.filter((item) => item.id !== record.id));
  else await api.deleteMyProjectExperiment(record.projectId, record.id);
}

let savingUnsaved: Promise<void> | null = null;

/**
 * Save everything unsaved to the signed-in account: each unsaved project,
 * then each unsaved experiment record, and point the project's lab sessions
 * at the saved project. Whatever can't be saved (no connection, say) stays
 * unsaved and is tried again next time.
 */
export function saveUnsaved(): Promise<void> {
  if (savingUnsaved) return savingUnsaved;
  const account = status.account;
  if (!account) return Promise.resolve();
  const data = readRoboticsData();
  if (!data.experiments.length && !data.projects.some((project) => isUnsavedProject(project.id))) return Promise.resolve();
  setStatus({ saving: true, unsavedError: null });
  savingUnsaved = (async () => {
    let failure: unknown = null;
    // Oldest first, so the account lists them in the order they were made.
    for (const project of readRoboticsData().projects.filter((item) => isUnsavedProject(item.id)).reverse()) {
      try {
        const saved = await api.createMyProject(project);
        if (status.account !== account) return;
        moved.set(project.id, saved.id);
        const now = readRoboticsData();
        writeRoboticsData({
          projects: now.projects.map((item) => (item.id === project.id ? saved : item)),
          experiments: now.experiments.map((record) => (record.projectId === project.id ? { ...record, projectId: saved.id } : record)),
        });
        const lab = useLab.getState();
        for (const session of lab.sessions) if (session.projectId === project.id) lab.linkProject(session.id, saved.id, saved.name);
      } catch (error) {
        failure = error;
      }
    }
    for (const record of readRoboticsData().experiments.filter((item) => !isUnsavedProject(item.projectId)).reverse()) {
      try {
        await api.createMyProjectExperiment(record.projectId, record);
        if (status.account !== account) return;
        setExperiments((experiments) => experiments.filter((item) => item.id !== record.id));
      } catch (error) {
        failure = error;
      }
    }
    if (status.account === account) setStatus({ unsavedError: failure });
  })().finally(() => {
    savingUnsaved = null;
    setStatus({ saving: false });
  });
  return savingUnsaved;
}

/**
 * Follow the signed-in account (null when signed out). Signing in saves what
 * was made signed out, then loads the account's projects. Signing out, or
 * switching account, shows nothing of the account that left.
 */
export function setProjectsAccount(account: string | null): void {
  if (account === status.account) return;
  const wasSignedOut = status.account === null;
  if (!wasSignedOut) {
    writeRoboticsData(EMPTY_ROBOTICS_DATA);
    moved.clear();
  }
  setStatus({ account, ready: !account, loading: !!account, error: null, saving: false, unsavedError: null });
  if (!account) return;
  void saveUnsaved().then(() => (status.account === account ? loadAccountProjects() : undefined));
}

export type ProjectsView = {
  /** Unsaved projects first, then the account's, each newest first. */
  projects: RoboticsProject[];
  /** Experiment records that are not on the server (yet). */
  unsavedRecords: ExperimentRecord[];
  signedIn: boolean;
  /** False while a signed-in account's projects are still on their way. */
  ready: boolean;
  /** The account's projects couldn't be loaded. */
  error: unknown;
  /** Unsaved projects are being saved to the account. */
  saving: boolean;
  /** Something made signed out couldn't be saved to the account. */
  unsavedError: unknown;
};

const EMPTY_PROJECTS: RoboticsProject[] = [];
const EMPTY_RECORDS: ExperimentRecord[] = [];

/** The projects this person can use, kept current. Null on the server and for the first paint. */
export function useProjects(): ProjectsView | null {
  const data = useSyncExternalStore(subscribeToRoboticsData, readRoboticsData, getServerRoboticsDataSnapshot);
  const state = useSyncExternalStore(subscribeToStatus, readStatus, readStatus);
  const account = useAuthStore((auth) => auth.user?.id ?? null);
  // A page can render before the account sync has run (it is mounted once, in the root layout).
  useEffect(() => setProjectsAccount(account), [account]);
  // The list keeps its identity until a project changes, so effects that depend on it don't rerun for a status change.
  const projects = useMemo(() => {
    if (!data?.projects.length) return EMPTY_PROJECTS;
    const unsaved = data.projects.filter((project) => isUnsavedProject(project.id)).sort(byNewest);
    const saved = data.projects.filter((project) => !isUnsavedProject(project.id)).sort(byNewest);
    return [...unsaved, ...saved];
  }, [data]);
  const unsavedRecords = data?.experiments.length ? data.experiments : EMPTY_RECORDS;
  return useMemo(
    () =>
      data
        ? {
            projects,
            unsavedRecords,
            // From the sign-in itself, so a page never calls someone signed out while their account loads.
            signedIn: account !== null,
            ready: state.ready && state.account === account,
            error: state.error,
            saving: state.saving,
            unsavedError: state.unsavedError,
          }
        : null,
    [data, projects, unsavedRecords, state, account],
  );
}

/** For tests: start from nothing, signed out. */
export function resetProjectsWorkspace(): void {
  savingUnsaved = null;
  moved.clear();
  writeRoboticsData(EMPTY_ROBOTICS_DATA);
  status = { account: null, ready: true, loading: false, error: null, saving: false, unsavedError: null };
  statusListeners.forEach((listener) => listener());
}
