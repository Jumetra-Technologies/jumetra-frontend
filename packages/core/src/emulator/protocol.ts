/**
 * Messages between the app and an emulator worker. One worker runs one board.
 *
 * Pin levels go through a SharedArrayBuffer when the page is cross-origin
 * isolated: the worker writes, the interface reads on each frame, and nothing
 * is posted per pin change. Without isolation the worker posts the changes.
 */
import type { BoardDefinition } from "../boards";
import type { PinChange, PinLevel } from "./avr";

export type { PinChange, PinLevel };

/** Byte codes for pin levels in the shared buffer. */
export const LEVEL_CODES: Record<PinLevel, number> = { input: 0, low: 1, high: 2, pullup: 3 };
export const LEVEL_NAMES: readonly PinLevel[] = ["input", "low", "high", "pullup"];

/** Slots in the shared buffer: one byte per Arduino pin number 0 to 31. */
export const PIN_SLOTS = 32;

export type ToWorker =
  | { type: "load"; board: BoardDefinition["id"]; hex: string; pins?: SharedArrayBuffer }
  | { type: "start" }
  | { type: "stop" }
  | { type: "input"; pin: number; high: boolean };

export type FromWorker =
  | { type: "loaded"; programBytes: number }
  | { type: "status"; running: boolean; simMs: number; speedPercent: number }
  | { type: "pins"; changes: PinChange[] }
  | { type: "serial"; text: string }
  | { type: "error"; message: string };
