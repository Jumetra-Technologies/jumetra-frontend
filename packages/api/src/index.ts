/**
 * The contract between the desktop app's main process and its interface.
 *
 * The interface never touches Node or the file system. It calls the methods
 * on `window.kiungo`, which the preload script builds from INVOKE_CHANNELS,
 * and the main process answers each channel with the handler typed here.
 * Arguments are checked again in the main process, because the interface is
 * the less trusted side.
 */

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

/** Every request the interface can make, with its arguments and its answer. */
export interface InvokeMap {
  "app:info": { args: []; result: AppInfo };
  "app:metrics": { args: []; result: StartupMetrics };
  "toolchain:status": { args: []; result: ToolchainStatus };
  "toolchain:compile-example": { args: [sketch: ExampleSketch, board: EmulatedBoardId]; result: CompileResult };
  "toolchain:install-core": { args: [core: InstallableCore]; result: InstallResult };
}

export type InvokeChannel = keyof InvokeMap;

export const INVOKE_CHANNELS = ["app:info", "app:metrics", "toolchain:status", "toolchain:compile-example", "toolchain:install-core"] as const satisfies readonly InvokeChannel[];

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
