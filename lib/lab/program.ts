/**
 * Run your own code on the website (WP-D2): the lab's Run sends the session's
 * sketch to Kiungo's compile service, loads the Intel HEX into an emulated
 * Arduino Uno in a worker, and passes the board's pins and serial back to the
 * lab. Modeled on the desktop's driver (apps/desktop/src/renderer/src/project/
 * program.ts); only the build step differs (the compile service instead of the
 * Arduino CLI on the computer). The emulator (@kiungo/core/emulator) is shared.
 *
 * When there's no code yet, no Uno, or the Uno is marked Physical or Hybrid,
 * the driver steps aside (`boardFor` is null) and Run shows the built-in
 * behavior, with `whyNot` saying why. When the compiler can't be reached or is
 * busy, Run falls back to the built-in behavior with a message (`fallback`),
 * never a blank failure. Real boards run from the Firmware page on the website.
 */

import type { BuildResult } from "@kiungo/api";
import type { FromWorker, ToWorker } from "@kiungo/core/emulator/protocol";
import type { PeripheralInput } from "@kiungo/core/emulator/peripherals";
import { boardIsReal } from "@kiungo/core/hybrid/plan";
import { EMULATED_PARTS } from "@kiungo/core/lab/program";
import type { LabNode } from "@kiungo/core/lab/types";
import type { ProgramDriver } from "@kiungo/lab/lab-context";
import type { compileSketch, SketchFile } from "./compile";

/** How long loading may take before the run gives up (a worker that never answers). */
const LOAD_TIMEOUT_MS = 10_000;

/** The sketch Run builds: the session's code files. Null or no files: the driver steps aside. */
export interface SketchSource {
  files: SketchFile[];
}

export interface WebProgramOptions {
  /** The code to build now (read at Run, so the latest edits count). */
  code: () => SketchSource | null;
  /** A build starts (the code pane shows it's compiling). */
  onBuildStart?: () => void;
  /** Each build's result, for the code pane's problems and output; null with why when no build happened. */
  onBuild?: (result: BuildResult | null, problem?: { kind: "refused" | "unavailable"; message: string }) => void;
  /** The build step; the compile service by default (loaded on the first Run, to keep it out of the lab's first load). */
  compile?: typeof compileSketch;
  /** A new emulator worker; the shared one by default. */
  createWorker?: () => Worker;
}

function defaultWorker(): Worker {
  return new Worker(new URL("./emulator-worker.ts", import.meta.url), { type: "module", name: "kiungo-emulator" });
}

const lazyCompile: typeof compileSketch = (...args) => import("./compile").then((m) => m.compileSketch(...args));

/** A CompileUnavailable from ./compile, told apart without importing it. */
const unavailableKind = (e: unknown): "refused" | "unavailable" | null => {
  const kind = (e as { kind?: unknown } | null)?.kind;
  return kind === "refused" || kind === "unavailable" ? kind : null;
};

const hasCode = (source: SketchSource | null) => !!source && source.files.some((f) => f.path.endsWith(".ino"));
const unoOf = (nodes: LabNode[]) => nodes.find((n) => EMULATED_PARTS.has(n.partId));

export function webProgramDriver({ code, onBuildStart, onBuild, compile = lazyCompile, createWorker = defaultWorker }: WebProgramOptions): ProgramDriver {
  let worker: Worker | null = null;
  let run = 0;
  let aborter: AbortController | null = null;

  const stop = () => {
    run++;
    aborter?.abort();
    aborter = null;
    if (worker) {
      worker.postMessage({ type: "stop" } satisfies ToWorker);
      worker.terminate();
      worker = null;
    }
  };

  return {
    boardFor: (nodes) => {
      const uno = unoOf(nodes);
      if (!uno || boardIsReal(uno) || !hasCode(code())) return null;
      return uno.id;
    },

    whyNot: (nodes) => {
      const uno = unoOf(nodes);
      if (!hasCode(code())) return "Run shows the built-in behavior. Open Code to write your own sketch and run it here.";
      if (!uno) {
        const other = nodes.find((n) => n.partId.startsWith("arduino-") || n.partId.startsWith("esp"));
        return other
          ? `Your code runs in the lab on the Arduino Uno for now; the ${other.label} runs its built-in behavior. Add an Arduino Uno to run your code.`
          : "Add an Arduino Uno to run your code on it.";
      }
      if (boardIsReal(uno)) return "This Uno is marked Physical or Hybrid, so Run uses the real board. To run your code in the lab, mark it Virtual; to put it on a real board, use the Firmware page.";
      return null;
    },

    start: async (_boardId, inputs, _circuit, on) => {
      stop();
      const mine = ++run;
      const source = code();
      if (!source || !hasCode(source)) return { ok: false, message: "There's no sketch to run. Open Code to write one.", fallback: true };
      on.stage("building");
      onBuildStart?.();
      const controller = new AbortController();
      aborter = controller;
      let build: BuildResult;
      try {
        build = await compile("arduino-uno", source.files, { signal: controller.signal });
      } catch (e) {
        if (mine !== run) return { ok: false, message: "Stopped." };
        if (unavailableKind(e) === "refused") {
          onBuild?.(null, { kind: "refused", message: (e as Error).message });
          return { ok: false, message: (e as Error).message };
        }
        const message = e instanceof Error ? e.message : "Kiungo's compiler isn't working right now, so Run shows the built-in behavior.";
        onBuild?.(null, { kind: "unavailable", message });
        return { ok: false, message, fallback: true };
      } finally {
        if (aborter === controller) aborter = null;
      }
      if (mine !== run) return { ok: false, message: "Stopped." };
      onBuild?.(build);
      if (!build.ok || !build.hex) {
        const errors = build.diagnostics.filter((d) => d.severity === "error").length;
        return {
          ok: false,
          message: build.message ?? (errors ? `Your code didn't build: ${errors === 1 ? "1 problem" : `${errors} problems`} in the Code pane.` : "Your code didn't build. The build output says why."),
        };
      }

      on.stage("starting");
      let w: Worker;
      try {
        w = createWorker();
      } catch {
        return { ok: false, message: "This browser can't run the emulated board, so Run shows the built-in behavior.", fallback: true };
      }
      worker = w;
      const hex = build.hex;
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          if (mine !== run) return;
          stop();
          resolve({ ok: false, message: "The emulated board didn't start. Try Run again." });
        }, LOAD_TIMEOUT_MS);
        w.onmessage = (event: MessageEvent<FromWorker>) => {
          if (mine !== run) return;
          const m = event.data;
          switch (m.type) {
            case "loaded":
              window.clearTimeout(timer);
              w.postMessage({ type: "peripherals", inputs } satisfies ToWorker);
              w.postMessage({ type: "start" } satisfies ToWorker);
              resolve({ ok: true, programBytes: m.programBytes, where: "the emulated Arduino Uno" });
              break;
            case "readings":
              on.readings({ boardId: _boardId, t: m.simMs / 1000, speedPercent: m.speedPercent, pins: m.pins, crashed: m.crashed });
              break;
            case "serial":
              on.serial(m.text);
              break;
            case "error":
              window.clearTimeout(timer);
              stop();
              resolve({ ok: false, message: m.message });
              break;
          }
        };
        w.onerror = () => {
          window.clearTimeout(timer);
          if (mine !== run) return;
          stop();
          resolve({ ok: false, message: "The emulated board stopped unexpectedly." });
        };
        w.postMessage({ type: "load", board: "uno", hex } satisfies ToWorker);
      });
    },

    stop,

    setInputs: (inputs: PeripheralInput[]) => worker?.postMessage({ type: "peripherals", inputs } satisfies ToWorker),

    sendSerial: (text: string) => worker?.postMessage({ type: "serial-in", text } satisfies ToWorker),
  };
}
