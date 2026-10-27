/**
 * An emulated ATmega328P (Uno, Nano) running the user's compiled program (EMU-01).
 *
 * The chip has exactly the board's flash and SRAM (HWT-01): a program that
 * doesn't fit is refused, and nothing can enlarge memory. Time is counted in
 * clock cycles only; this file never reads a wall clock, so the same program
 * with the same inputs always runs the same way (EMU-04).
 */
import {
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  CPU,
  PinState,
  avrInstruction,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from "avr8js";
import type { BoardDefinition, BoardPin } from "../boards";
import { maxSketchBytes } from "../boards";
import { parseIntelHex } from "../firmware/intel-hex";

export type PinLevel = "high" | "low" | "input" | "pullup";

export interface PinChange {
  /** The Arduino pin number (13 for D13, 14 for A0). */
  pin: number;
  level: PinLevel;
  /** The CPU cycle the change happened on. */
  cycle: number;
}

function levelOf(state: PinState): PinLevel {
  switch (state) {
    case PinState.High:
      return "high";
    case PinState.Low:
      return "low";
    case PinState.InputPullUp:
      return "pullup";
    default:
      return "input";
  }
}

export class AvrBoard {
  readonly board: BoardDefinition;
  /** Size of the loaded program, in bytes of flash. */
  readonly programBytes: number;
  private readonly cpu: CPU;
  private readonly ports: Record<BoardPin["port"], AVRIOPort>;
  private readonly levels = new Map<number, PinLevel>();
  private pinListeners: Array<(change: PinChange) => void> = [];
  private serialListeners: Array<(byte: number) => void> = [];

  /**
   * @param program The compiled program as Intel HEX text (what Arduino CLI
   *   writes as `sketch.ino.hex`) or as the raw flash image.
   */
  constructor(board: BoardDefinition, program: string | Uint8Array) {
    if (board.mcu !== "atmega328p") throw new Error(`${board.name} isn't emulated yet.`);
    this.board = board;
    const image = typeof program === "string" ? parseIntelHex(program, maxSketchBytes(board)) : program;
    if (image.length > maxSketchBytes(board)) {
      throw new Error(`The program is ${image.length.toLocaleString("en-US")} bytes, more than the ${maxSketchBytes(board).toLocaleString("en-US")} the ${board.name} has room for.`);
    }
    this.programBytes = image.length;
    const flash = new Uint16Array(board.flashBytes / 2);
    new Uint8Array(flash.buffer).set(image);
    this.cpu = new CPU(flash, board.sramBytes);

    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);
    const usart = new AVRUSART(this.cpu, usart0Config, board.clockHz);
    usart.onByteTransmit = (byte) => this.serialListeners.forEach((l) => l(byte));

    this.ports = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    };
    for (const pin of board.pins) this.levels.set(pin.arduino, "input");
    for (const name of ["B", "C", "D"] as const) {
      this.ports[name].addListener(() => this.onPortChange(name));
    }
  }

  private onPortChange(port: BoardPin["port"]) {
    for (const pin of this.board.pins) {
      if (pin.port !== port) continue;
      const level = levelOf(this.ports[port].pinState(pin.bit));
      if (this.levels.get(pin.arduino) === level) continue;
      this.levels.set(pin.arduino, level);
      const change: PinChange = { pin: pin.arduino, level, cycle: this.cpu.cycles };
      this.pinListeners.forEach((l) => l(change));
    }
  }

  /** Clock cycles run since reset. */
  get cycles(): number {
    return this.cpu.cycles;
  }

  /** Simulated time since reset, in milliseconds. */
  get timeMs(): number {
    return (this.cpu.cycles / this.board.clockHz) * 1000;
  }

  /** Run the CPU for a number of clock cycles. */
  runCycles(cycles: number): void {
    const cpu = this.cpu;
    const end = cpu.cycles + cycles;
    while (cpu.cycles < end) {
      avrInstruction(cpu);
      cpu.tick();
    }
  }

  /** Run the CPU for a stretch of simulated time. */
  runMs(ms: number): void {
    this.runCycles(Math.round((ms / 1000) * this.board.clockHz));
  }

  level(pin: number): PinLevel {
    return this.levels.get(pin) ?? "input";
  }

  /** Drive an input pin from outside (a button, a sensor's digital output). */
  setInput(pin: number, high: boolean): void {
    const def = this.board.pins.find((p) => p.arduino === pin);
    if (!def) throw new Error(`${this.board.name} has no pin ${pin}.`);
    this.ports[def.port].setPin(def.bit, high);
  }

  onPinChange(listener: (change: PinChange) => void): () => void {
    this.pinListeners.push(listener);
    return () => (this.pinListeners = this.pinListeners.filter((l) => l !== listener));
  }

  onSerialByte(listener: (byte: number) => void): () => void {
    this.serialListeners.push(listener);
    return () => (this.serialListeners = this.serialListeners.filter((l) => l !== listener));
  }
}
