/**
 * The Engineering Lab's own model of a build.
 *
 * A lab session is what a person is building: the parts on the canvas, the
 * wires between their pins and a log of what happened. Sessions live in the
 * browser so the lab opens instantly and keeps working without the backend;
 * when the backend is reachable a session is mirrored to it as a runtime.
 */
import type { SessionCode } from "./code";

export type LabView = "reality" | "top" | "flow";

export type DeviceMode = "virtual" | "physical" | "hybrid";

export interface LabNode {
  id: string;
  /** Part id from `lib/parts` (also the backend catalog id). */
  partId: string;
  label: string;
  x: number;
  y: number;
  mode: DeviceMode;
}

export interface PinRef {
  node: string;
  pin: string;
}

export interface LabWire {
  id: string;
  from: PinRef;
  to: PinRef;
  /** A color the person picked; otherwise the color of the net's kind. */
  color?: string;
}

export type LogKind = "session" | "build" | "wire" | "run" | "state" | "fault" | "fix" | "note";

export interface LogEntry {
  id: string;
  at: string;
  kind: LogKind;
  text: string;
  /** Nodes the entry is about, so the lab can point at them. */
  nodes?: string[];
}

/**
 * What a person has set on a part: a sensor's surroundings (the obstacle
 * distance, the temperature), a command to an actuator (motor speed), or a
 * board's sketch settings (blink delay, warning distance). Keys and ranges
 * are declared per part in `lib/lab/controls.ts`.
 */
export type NodeInputs = Record<string, number | string | boolean>;

export interface LabSession {
  id: string;
  name: string;
  /** A Projects-page project this session belongs to. */
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  nodes: LabNode[];
  wires: LabWire[];
  log: LogEntry[];
  view: LabView;
  /** Total simulated run time, for the project summary. */
  runMs: number;
  /** Inputs, commands and sketch settings by node id. Absent for sessions saved before 1.3. */
  inputs?: Record<string, NodeInputs>;
  /**
   * The units `inputs` are stored in: 2 is SI (lab/units.ts). Absent or 1 for
   * sessions saved before SI units; they are converted when they're opened
   * (`migrateSessionUnits`).
   */
  units?: number;
  /** The session's own sketch (the website's lab runs it). Absent until the code pane is first opened, and in lab data before version 2. */
  code?: SessionCode;
  /** Backend workspace mirroring this session, when one exists. */
  runtime?: { workspaceId: string; nodeIds: Record<string, string>; wireIds: Record<string, string> } | null;
}

/**
 * The lab data's version. 2 (website 1.46.0) adds each session's `code`;
 * version 1 data reads as it is (its sessions have no code yet).
 */
export const LAB_DATA_VERSION = 2;

export interface LabData {
  version: 1 | typeof LAB_DATA_VERSION;
  sessions: LabSession[];
  activeId: string | null;
}
