/**
 * The contract between the desktop app's main process and its interface.
 *
 * The interface never touches Node or the file system. It calls the methods
 * on `window.kiungo`, which the preload script builds from INVOKE_CHANNELS,
 * and the main process answers each channel with the handler typed here.
 * Arguments are checked again in the main process, because the interface is
 * the less trusted side.
 */

import type { LabNode, LabSession, LabWire } from "@kiungo/core/lab/types";
import type { CircuitThumbnail, ProjectMeta } from "@kiungo/core/project";

export type Platform = "win32" | "linux" | "darwin";

export interface AppInfo {
  appVersion: string;
  platform: Platform;
  arch: string;
  versions: { electron: string; chrome: string; node: string };
}

export interface StartupMetrics {
  /** From the main process starting to the window being shown, in ms. */
  toWindowShownMs: number | null;
  /** Main process memory (resident set), in MB. */
  mainRssMb: number;
  /** Working set of every app process together, in MB: what the Phase Two memory budget measures. */
  totalMb: number;
}

export interface ToolchainStatus {
  /** The Arduino CLI the app found, if any. */
  cli: { found: true; version: string; path: string } | { found: false; hint: string };
  /** Board cores Arduino CLI has installed. */
  cores: Array<{ id: string; version: string }>;
}

export type ExampleSketch = "Blink";
export type EmulatedBoardId = "uno" | "nano";

export interface CompileResult {
  ok: boolean;
  /** Intel HEX of the program, ready for the emulator or an upload. */
  hex?: string;
  /** Flash and static RAM the program uses, as Arduino CLI reports them. */
  flash?: { used: number; max: number };
  ram?: { used: number; max: number };
  durationMs: number;
  /** Compiler output, for the build panel. */
  log: string;
}

export interface InstallResult {
  ok: boolean;
  durationMs: number;
  log: string;
}

/** Board cores the app may install. Versions are pinned so a project builds the same everywhere. */
export const INSTALLABLE_CORES = ["arduino:avr@1.8.6"] as const;
export type InstallableCore = (typeof INSTALLABLE_CORES)[number];

/** A project on Home: from the recent list, read fresh from its folder. */
export interface RecentProject {
  path: string;
  /** Null when the folder is gone or no longer a Kiungo project. */
  name: string | null;
  board: string | null;
  boardName: string | null;
  /** When it was last opened in Kiungo (ISO). */
  openedAt: string;
  thumbnail: CircuitThumbnail | null;
  missing: boolean;
}

/** Undo and redo for the open circuit. */
export interface ProjectHistory {
  past: Array<{ nodes: LabNode[]; wires: LabWire[] }>;
  future: Array<{ nodes: LabNode[]; wires: LabWire[] }>;
}

/** A project, opened: what the lab needs to show it. */
export interface OpenedProject {
  path: string;
  meta: ProjectMeta;
  session: LabSession;
  history: ProjectHistory | null;
  /** Parts or wires in circuit.json the lab couldn't use, already dropped. */
  warnings: string[];
}

export type OpenResult = { ok: true; project: OpenedProject } | { ok: false; message: string };

export interface NewProjectInput {
  name: string;
  /** A lab board part ("arduino-uno"); must be one of PROJECT_BOARDS. */
  board: string;
  /** A starter id, or null for a blank project. */
  starter: string | null;
}

export interface SavePayload {
  session: LabSession;
  history: ProjectHistory;
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string };

export interface ProjectSettings {
  /** Where new projects are made. Documents/Kiungo unless the user picked another folder. */
  projectsFolder: string;
}

/** Every request the interface can make, with its arguments and its answer. */
export interface InvokeMap {
  "app:info": { args: []; result: AppInfo };
  "app:metrics": { args: []; result: StartupMetrics };
  "toolchain:status": { args: []; result: ToolchainStatus };
  "toolchain:compile-example": { args: [sketch: ExampleSketch, board: EmulatedBoardId]; result: CompileResult };
  "toolchain:install-core": { args: [core: InstallableCore]; result: InstallResult };
  "projects:recent": { args: []; result: RecentProject[] };
  "projects:create": { args: [input: NewProjectInput]; result: OpenResult };
  /** Open a project from the recent list. Other paths are refused: the interface never names arbitrary folders. */
  "projects:open-recent": { args: [path: string]; result: OpenResult };
  /** Ask for a folder and open it; null if the user cancelled. */
  "projects:open-dialog": { args: []; result: OpenResult | null };
  /** Save the open project's circuit and history. Only a project opened in this window can be saved. */
  "projects:save": { args: [path: string, payload: SavePayload]; result: SaveResult };
  /** Wait for pending saves, then let the project go. */
  "projects:close": { args: [path: string]; result: void };
  "projects:forget": { args: [path: string]; result: RecentProject[] };
  "projects:reveal": { args: [path: string]; result: void };
  "projects:settings": { args: []; result: ProjectSettings };
  /** Ask for a new projects folder; returns the settings, changed or not. */
  "projects:choose-folder": { args: []; result: ProjectSettings };
}

export type InvokeChannel = keyof InvokeMap;

export const INVOKE_CHANNELS = [
  "app:info",
  "app:metrics",
  "toolchain:status",
  "toolchain:compile-example",
  "toolchain:install-core",
  "projects:recent",
  "projects:create",
  "projects:open-recent",
  "projects:open-dialog",
  "projects:save",
  "projects:close",
  "projects:forget",
  "projects:reveal",
  "projects:settings",
  "projects:choose-folder",
] as const satisfies readonly InvokeChannel[];

/** Fails to compile when a channel in InvokeMap is missing from INVOKE_CHANNELS (the preload would refuse it). */
type UnlistedChannel = Exclude<InvokeChannel, (typeof INVOKE_CHANNELS)[number]>;
export const EVERY_CHANNEL_LISTED: [UnlistedChannel] extends [never] ? true : UnlistedChannel = true;

export const EXAMPLE_SKETCHES: readonly ExampleSketch[] = ["Blink"];
export const EMULATED_BOARDS: readonly EmulatedBoardId[] = ["uno", "nano"];

/** What `window.kiungo` looks like in the interface. */
export interface KiungoBridge {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeMap[C]["args"]): Promise<InvokeMap[C]["result"]>;
}

export type Handler<C extends InvokeChannel> = (...args: InvokeMap[C]["args"]) => Promise<InvokeMap[C]["result"]> | InvokeMap[C]["result"];
export type Handlers = { [C in InvokeChannel]: Handler<C> };

export function isInvokeChannel(value: unknown): value is InvokeChannel {
  return typeof value === "string" && (INVOKE_CHANNELS as readonly string[]).includes(value);
}
