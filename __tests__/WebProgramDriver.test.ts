import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuildResult } from "@kiungo/api";
import type { ToWorker } from "@kiungo/core/emulator/protocol";
import type { LabNode } from "@kiungo/core/lab/types";
import { compileSketch, CompileUnavailable, resetWakeForTests, wakeCompiler } from "@/lib/lab/compile";
import { webProgramDriver } from "@/lib/lab/program";

const BLINK = { files: [{ path: "Blink.ino", content: "void setup(){pinMode(13,OUTPUT);} void loop(){}" }] };
const HEX = ":100000000C945C000C946E000C946E000C946E00CA\n:00000001FF\n";
const node = (id: string, partId: string, mode: LabNode["mode"] = "virtual") => ({ id, partId, label: partId === "arduino-uno" ? "Arduino Uno" : "Arduino Nano", mode }) as unknown as LabNode;
const circuit = { nodes: [], analysis: {} } as never;

/** Stands in for the emulator worker: answers "loaded" to a load, and lets the test send readings. */
class FakeWorker {
  sent: ToWorker[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage(m: ToWorker) {
    this.sent.push(m);
    if (m.type === "load") queueMicrotask(() => this.onmessage?.({ data: { type: "loaded", programBytes: 924 } } as MessageEvent));
  }
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
  terminate() {
    this.terminated = true;
  }
}

const good: BuildResult = { ok: true, hex: HEX, diagnostics: [], flash: { used: 924, max: 32256 }, ram: { used: 9, max: 2048 }, durationMs: 1800, log: "Sketch uses 924 bytes" };
const handlers = () => ({ readings: vi.fn(), serial: vi.fn(), stage: vi.fn() });

describe("the website's program driver (WP-D2)", () => {
  it("steps aside until there's a sketch, an Uno, and the Uno runs in the lab", () => {
    let code: typeof BLINK | null = null;
    const driver = webProgramDriver({ code: () => code });
    const uno = node("u1", "arduino-uno");
    expect(driver.boardFor([uno])).toBeNull();
    expect(driver.whyNot?.([uno])).toMatch(/Open Code/);
    code = BLINK;
    expect(driver.boardFor([uno])).toBe("u1");
    expect(driver.whyNot?.([uno])).toBeNull();
    expect(driver.boardFor([node("n1", "arduino-nano")])).toBeNull();
    expect(driver.whyNot?.([node("n1", "arduino-nano")])).toMatch(/Arduino Uno for now; the Arduino Nano runs its built-in behavior/);
    expect(driver.boardFor([node("u1", "arduino-uno", "physical")])).toBeNull();
    expect(driver.whyNot?.([node("u1", "arduino-uno", "hybrid")])).toMatch(/marked Physical or Hybrid/);
  });

  it("builds the session's sketch, loads the HEX into the emulated Uno and passes its readings and serial to the lab", async () => {
    const worker = new FakeWorker();
    const compile = vi.fn(async () => good);
    const onBuild = vi.fn();
    const driver = webProgramDriver({ code: () => BLINK, compile, onBuild, createWorker: () => worker as unknown as Worker });
    const on = handlers();
    const result = await driver.start("u1", [], circuit, on);
    expect(result).toEqual({ ok: true, programBytes: 924, where: "the emulated Arduino Uno" });
    expect(compile).toHaveBeenCalledWith("arduino-uno", BLINK.files, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(on.stage.mock.calls.map((c) => c[0])).toEqual(["building", "starting"]);
    expect(onBuild).toHaveBeenCalledWith(good);
    expect(worker.sent.map((m) => m.type)).toEqual(["load", "peripherals", "start"]);
    expect(worker.sent[0]).toMatchObject({ board: "uno", hex: HEX });
    worker.emit({ type: "readings", simMs: 500, speedPercent: 100, pins: [{ pin: 13, level: "high", duty: 1, hz: 0, pulseUs: null }], crashed: null });
    expect(on.readings).toHaveBeenCalledWith(expect.objectContaining({ boardId: "u1", t: 0.5 }));
    worker.emit({ type: "serial", text: "hi\n" });
    expect(on.serial).toHaveBeenCalledWith("hi\n");
    driver.stop();
    expect(worker.terminated).toBe(true);
  });

  it("a sketch that doesn't build stops the run with its problems, and doesn't fall back", async () => {
    const bad: BuildResult = { ok: false, diagnostics: [{ file: "Blink.ino", path: "/tmp/b/Blink/Blink.ino", line: 1, column: 1, severity: "error", message: "'digitalWrit' was not declared", notes: [] }], durationMs: 900, log: "" };
    const onBuild = vi.fn();
    const driver = webProgramDriver({ code: () => BLINK, compile: async () => bad, onBuild, createWorker: () => new FakeWorker() as unknown as Worker });
    expect(await driver.start("u1", [], circuit, handlers())).toEqual({ ok: false, message: "Your code didn't build: 1 problem in the Code pane." });
    expect(onBuild).toHaveBeenCalledWith(bad);
  });

  it("when the compiler can't be reached or is busy, Run falls back to the built-in behavior with a clear message", async () => {
    const driver = webProgramDriver({ code: () => BLINK, compile: async () => { throw new CompileUnavailable("unavailable", "Kiungo's compiler can't be reached (check your connection), so Run shows the built-in behavior."); } });
    expect(await driver.start("u1", [], circuit, handlers())).toEqual({ ok: false, fallback: true, message: "Kiungo's compiler can't be reached (check your connection), so Run shows the built-in behavior." });
  });

  it("a sketch the compiler refuses (an #include outside the sketch) is the code's to fix: no fallback", async () => {
    const onBuild = vi.fn();
    const driver = webProgramDriver({ code: () => BLINK, onBuild, compile: async () => { throw new CompileUnavailable("refused", "Blink.ino line 1: #include a library or a file of this sketch by name."); } });
    const result = await driver.start("u1", [], circuit, handlers());
    expect(result).toEqual({ ok: false, message: "Blink.ino line 1: #include a library or a file of this sketch by name." });
    expect(onBuild).toHaveBeenCalledWith(null, "Blink.ino line 1: #include a library or a file of this sketch by name.");
  });

  it("Stop during the build cancels it", async () => {
    let seen: AbortSignal | undefined;
    const driver = webProgramDriver({
      code: () => BLINK,
      compile: (_b, _f, opts) =>
        new Promise((_, reject) => {
          seen = opts?.signal;
          opts?.signal?.addEventListener("abort", () => reject(new CompileUnavailable("unavailable", "Stopped.")));
        }),
    });
    const started = driver.start("u1", [], circuit, handlers());
    driver.stop();
    expect(seen?.aborted).toBe(true);
    expect(await started).toEqual({ ok: false, message: "Stopped." });
  });
});

describe("the compile service client", () => {
  afterEach(() => resetWakeForTests());
  const answer = (status: number, body: unknown, headers: Record<string, string> = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));

  it("turns the service's answer into the desktop's build shape, problems parsed with the shared parser", async () => {
    const log = "/tmp/kiungo-build-x/Blink/Blink.ino:2:15: error: 'digitalWrit' was not declared in this scope";
    const fetchImpl = answer(200, { ok: false, log, sketchDir: "/tmp/kiungo-build-x/Blink", durationMs: 700 });
    const result = await compileSketch("arduino-uno", BLINK.files, { fetchImpl, base: "https://compile.test" });
    expect(fetchImpl).toHaveBeenCalledWith("https://compile.test/firmware/compile", expect.objectContaining({ method: "POST", body: JSON.stringify({ board: "arduino-uno", files: BLINK.files }) }));
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ file: "Blink.ino", line: 2, column: 15, severity: "error" });
    const ok = await compileSketch("arduino-uno", BLINK.files, { fetchImpl: answer(200, { ok: true, hex: HEX, log: "", sketchDir: "/x/Blink", flash: { used: 924, max: 32256 }, durationMs: 1200, cached: false }) });
    expect(ok).toMatchObject({ ok: true, hex: HEX, flash: { used: 924, max: 32256 } });
  });

  it("says plainly why no build happened: refused, busy, unreachable", async () => {
    await expect(compileSketch("arduino-uno", BLINK.files, { fetchImpl: answer(422, { detail: "Two files are called a.h." }) })).rejects.toMatchObject({ kind: "refused", message: "Two files are called a.h." });
    await expect(compileSketch("arduino-uno", BLINK.files, { fetchImpl: answer(429, { detail: "busy" }, { "Retry-After": "7" }) })).rejects.toMatchObject({ kind: "unavailable", message: expect.stringContaining("Try again in 7 seconds") });
    await expect(compileSketch("arduino-uno", BLINK.files, { fetchImpl: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) })).rejects.toMatchObject({ kind: "unavailable", message: expect.stringContaining("can't be reached") });
    await expect(compileSketch("arduino-uno", BLINK.files, { fetchImpl: answer(503, {}) })).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("wakes the sleeping service once per page", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await wakeCompiler(fetchImpl, "https://compile.test")).toBe(true);
    await wakeCompiler(fetchImpl, "https://compile.test");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith("https://compile.test/health", { method: "GET" });
  });
});
