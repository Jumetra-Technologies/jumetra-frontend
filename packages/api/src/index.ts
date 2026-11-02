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
import type { Diagnostic, ProfileLibrary } from "@kiungo/core/build";

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

/** Who is signed in to this copy of Kiungo (DSK-01 to DSK-03). */
export interface AccountUser {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
}

/**
 * The sign-in state the interface shows.
 * - `signed-out`: nobody; `canSkip` is true when signing in can't start (offline, or the
 *   service isn't there), so the app can still be used.
 * - `waiting`: the browser is open on the website's sign-in page.
 * - `signed-in`: `offline` while the session can't be checked; it still counts.
 */
export type AuthState =
  | { status: "signed-out"; message: string | null; canSkip: boolean; skipped: boolean }
  | { status: "waiting"; startedAt: string; expiresAt: string; signInUrl: string }
  | { status: "signed-in"; user: AccountUser; deviceName: string; offline: boolean; secureStorage: boolean };

/** A file in a project's sketch folder. */
export interface SketchFile {
  name: string;
  /** The main file: named after the folder, can't be renamed or deleted. */
  main: boolean;
  size: number;
}

export type SketchResult = { ok: true } | { ok: false; message: string };

/** A project's build (BLD-01, BLD-02, ERR-01). */
export interface BuildResult {
  ok: boolean;
  /** Compiler and linker problems, mapped to the sketch's files and lines. */
  diagnostics: Diagnostic[];
  /** The program as Intel HEX, when the build worked. */
  hex?: string;
  flash?: { used: number; max: number };
  ram?: { used: number; max: number };
  durationMs: number;
  /** Why the build couldn't run at all (no Arduino CLI, no internet the first time), in plain words. */
  message?: string;
  /** Everything the compiler said, for the build log. */
  log: string;
}

/** A library in the Arduino library index. */
export interface LibraryInfo {
  name: string;
  version: string;
  /** One line on what it does, from the library's own description. */
  sentence: string;
  author: string;
  website: string | null;
}

export type LibrarySearchResult = { ok: true; libraries: LibraryInfo[] } | { ok: false; message: string };

/** After adding or removing: the sketch's libraries, as sketch.yaml now pins them. */
export type LibraryChange = { ok: true; libraries: ProfileLibrary[]; added: string[] } | { ok: false; message: string };

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
  "auth:state": { args: []; result: AuthState };
  /** Open the website's sign-in page in the browser and wait for it to send the app back. */
  "auth:sign-in": { args: []; result: AuthState };
  /** Stop waiting for the browser. */
  "auth:cancel": { args: []; result: AuthState };
  /** End this computer's session. Projects on disk are never touched. */
  "auth:sign-out": { args: []; result: AuthState };
  /** Use Kiungo without signing in, when signing in can't start. */
  "auth:skip": { args: []; result: AuthState };
  /** The open project's sketch files, main file first. */
  "sketch:list": { args: [projectPath: string]; result: SketchFile[] };
  "sketch:read": { args: [projectPath: string, name: string]; result: { ok: true; content: string } | { ok: false; message: string } };
  /** Save a file whole (crash-safe). */
  "sketch:write": { args: [projectPath: string, name: string, content: string]; result: SketchResult };
  "sketch:create": { args: [projectPath: string, name: string]; result: SketchResult };
  "sketch:rename": { args: [projectPath: string, from: string, to: string]; result: SketchResult };
  /** Move a file to the computer's trash, so it can be got back. */
  "sketch:delete": { args: [projectPath: string, name: string]; result: SketchResult };
  /** Build the open project with its sketch.yaml profile. One build per project at a time: a second call gets the first's answer. */
  "build:compile": { args: [projectPath: string]; result: BuildResult };
  /** The libraries the open project's sketch.yaml pins. */
  "libraries:list": { args: [projectPath: string]; result: ProfileLibrary[] };
  /** Search the Arduino library index for libraries that work on AVR boards. */
  "libraries:search": { args: [query: string]; result: LibrarySearchResult };
  /** Pin a library, and the libraries it needs, in the open project's sketch.yaml. No version means the newest. */
  "libraries:add": { args: [projectPath: string, name: string, version?: string]; result: LibraryChange };
  /** Unpin a library, and the libraries only it needed. */
  "libraries:remove": { args: [projectPath: string, name: string]; result: LibraryChange };
}

/** Messages the main process sends the interface, unasked. */
export interface EventMap {
  "auth:changed": AuthState;
}

export type EventChannel = keyof EventMap;
export const EVENT_CHANNELS = ["auth:changed"] as const satisfies readonly EventChannel[];

export function isEventChannel(value: unknown): value is EventChannel {
  return typeof value === "string" && (EVENT_CHANNELS as readonly string[]).includes(value);
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
  "auth:state",
  "auth:sign-in",
  "auth:cancel",
  "auth:sign-out",
  "auth:skip",
  "sketch:list",
  "sketch:read",
  "sketch:write",
  "sketch:create",
  "sketch:rename",
  "sketch:delete",
  "build:compile",
  "libraries:list",
  "libraries:search",
  "libraries:add",
  "libraries:remove",
] as const satisfies readonly InvokeChannel[];

/** Fails to compile when a channel in InvokeMap is missing from INVOKE_CHANNELS (the preload would refuse it). */
type UnlistedChannel = Exclude<InvokeChannel, (typeof INVOKE_CHANNELS)[number]>;
export const EVERY_CHANNEL_LISTED: [UnlistedChannel] extends [never] ? true : UnlistedChannel = true;

export const EXAMPLE_SKETCHES: readonly ExampleSketch[] = ["Blink"];
export const EMULATED_BOARDS: readonly EmulatedBoardId[] = ["uno", "nano"];

/** What `window.kiungo` looks like in the interface. */
export interface KiungoBridge {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeMap[C]["args"]): Promise<InvokeMap[C]["result"]>;
  /** Listen for a message from the main process; returns a function that stops listening. */
  on<E extends EventChannel>(channel: E, listener: (payload: EventMap[E]) => void): () => void;
}

export type Handler<C extends InvokeChannel> = (...args: InvokeMap[C]["args"]) => Promise<InvokeMap[C]["result"]> | InvokeMap[C]["result"];
export type Handlers = { [C in InvokeChannel]: Handler<C> };

export function isInvokeChannel(value: unknown): value is InvokeChannel {
  return typeof value === "string" && (INVOKE_CHANNELS as readonly string[]).includes(value);
}
