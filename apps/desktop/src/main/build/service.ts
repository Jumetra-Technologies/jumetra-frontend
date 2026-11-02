/**
 * Builds a project, and manages the libraries it builds with (BLD-01, BLD-02,
 * BLD-04, BLD-05, ERR-01).
 *
 * A build uses the project's own sketch.yaml profile, so the board package and
 * every library are the exact versions pinned there, on every computer.
 * Arduino CLI downloads anything missing the first time, into Kiungo's own
 * data folder, then builds offline from then on.
 */

import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuildResult, LibraryChange, LibraryInfo, LibrarySearchResult } from "@kiungo/api";
import { parseDiagnostics, readSketchProfile, type ProfileLibrary } from "@kiungo/core/build";
import { SKETCH_DIR, SKETCH_FILE, SKETCH_PROFILE_FILE } from "@kiungo/core/project";
import type { HardwareBoard } from "@kiungo/core/hardware/boards";
import { uploadProblem, type HostPlatform, type UploadProblem } from "@kiungo/core/hardware/upload";
import { parseJson, type CliLocation, type CompileJson, type RunResult } from "../toolchain/arduino-cli";

export const PROFILE = "kiungo";

export interface BuildServiceOptions {
  cli: () => CliLocation | null;
  /** Where builds go: one folder per project, kept so the next build is quick. */
  buildsDir: string;
  run: (cli: CliLocation, args: string[], timeoutMs?: number) => Promise<RunResult>;
  now?: () => number;
}

const NO_CLI = "Arduino CLI isn't installed with this copy of Kiungo, so it can't build. Reinstall Kiungo, or in development run npm run fetch:arduino-cli in apps/desktop.";

/** What went wrong when Arduino CLI couldn't get as far as compiling. */
export function setupProblem(output: string): string | null {
  if (/dial tcp|no such host|i\/o timeout|connection refused|Error downloading|network is unreachable|TLS handshake/i.test(output)) {
    return "Kiungo needs the internet once to download the board package and libraries this sketch uses. Connect, then build again: after that it builds offline.";
  }
  if (/library .* not found|Library '.*' not found|invalid library/i.test(output)) {
    return "A library in this sketch's settings isn't in the Arduino library index. Remove it from Libraries, then build again.";
  }
  if (/platform .* not found|Platform '.*' not found|invalid version/i.test(output)) {
    return "The board package this sketch asks for can't be found. Check the board in the project settings.";
  }
  if (/Error opening sketch|no valid sketch found|main file missing/i.test(output)) {
    return `The sketch folder is missing its main file (${SKETCH_FILE}).`;
  }
  return null;
}

interface SearchJson {
  libraries?: Array<{ name?: string; latest?: { version?: string; sentence?: string; author?: string; website?: string; architectures?: string[] } }>;
}

interface ProfileLibJson {
  added_libraries?: Array<{ index_library?: { name?: string; version?: string } } | { name?: string; version?: string }>;
}

const nameOf = (entry: unknown): string | null => {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as { name?: unknown; index_library?: { name?: unknown; version?: unknown }; library?: unknown };
  const lib = e.index_library ?? e;
  return typeof lib.name === "string" ? `${lib.name}${typeof (lib as { version?: unknown }).version === "string" ? ` ${(lib as { version: string }).version}` : ""}` : null;
};

/** The sketch folder as Kiungo names it and as the file system does (Windows 8.3 names, symlinks). */
export function sketchSpellings(dir: string): string[] {
  const out = [dir];
  try {
    const real = realpathSync.native(dir);
    if (real !== dir) out.push(real);
  } catch {
    // Not there: the build will say so.
  }
  return out;
}

export interface UploadOutcome {
  ok: boolean;
  /** Where it stopped: the build, or the upload itself. */
  stage: "build" | "upload";
  build: BuildResult;
  problem?: UploadProblem;
  log: string;
  durationMs: number;
}

export class BuildService {
  private readonly running = new Map<string, Promise<BuildResult>>();
  private libraryEdit: Promise<unknown> = Promise.resolve();
  private readonly now: () => number;

  constructor(private readonly options: BuildServiceOptions) {
    this.now = options.now ?? (() => performance.now());
  }

  /** The build folder for a project (and board, when it isn't the project's own): the same folder every time, never inside the project. */
  buildPath(projectPath: string, fqbn?: string): string {
    const id = createHash("sha256").update(projectPath).digest("hex").slice(0, 16);
    return join(this.options.buildsDir, fqbn ? `${id}-${fqbn.replace(/[^\w]+/g, "_")}` : id);
  }

  /** Build the project, for its own board or, with `fqbn`, for another board with the same chip (a Nano for a Uno project). */
  compile(projectPath: string, fqbn?: string): Promise<BuildResult> {
    const key = `${projectPath}\n${fqbn ?? ""}`;
    const existing = this.running.get(key);
    if (existing) return existing;
    const job = this.doCompile(projectPath, fqbn).finally(() => this.running.delete(key));
    this.running.set(key, job);
    return job;
  }

  private async doCompile(projectPath: string, fqbn?: string): Promise<BuildResult> {
    const cli = this.options.cli();
    const started = this.now();
    const elapsed = () => Math.round(this.now() - started);
    if (!cli) return { ok: false, diagnostics: [], durationMs: 0, message: NO_CLI, log: "" };
    const sketchDir = join(projectPath, SKETCH_DIR);
    if (!existsSync(join(sketchDir, SKETCH_PROFILE_FILE))) {
      return { ok: false, diagnostics: [], durationMs: 0, message: "This project has no build settings (sketch/sketch.yaml). Make a new project, or copy sketch.yaml from one.", log: "" };
    }
    const buildPath = this.buildPath(projectPath, fqbn);
    await mkdir(buildPath, { recursive: true });
    // A first build may download the board package and libraries: allow it time.
    const raw = await this.options.run(cli, ["compile", "--profile", PROFILE, ...(fqbn ? ["--fqbn", fqbn] : []), "--build-path", buildPath, "--format", "json", sketchDir], 900_000);
    const json = parseJson<CompileJson>(raw.stdout);
    const sections = json?.builder_result?.executable_sections_size ?? [];
    const text = sections.find((s) => s.name === "text");
    const data = sections.find((s) => s.name === "data");
    const compilerOutput = [json?.compiler_out, json?.compiler_err].filter(Boolean).join("\n");
    const log = [compilerOutput, raw.stderr].filter((s) => s?.trim()).join("\n").trim() || raw.stdout.trim();
    const diagnostics = parseDiagnostics(`${compilerOutput}\n${raw.stderr}`, sketchSpellings(sketchDir));
    const ok = Boolean(json?.success) && raw.code === 0;
    const result: BuildResult = {
      ok,
      diagnostics,
      ...(text ? { flash: { used: text.size, max: text.max_size } } : {}),
      ...(data ? { ram: { used: data.size, max: data.max_size } } : {}),
      durationMs: elapsed(),
      log,
    };
    if (!ok) {
      // No compiler problems means it never got to compiling: say why in plain words.
      if (!diagnostics.length) result.message = setupProblem(log) ?? "The build stopped before compiling. The build log says why.";
      return result;
    }
    // AVR boards get Intel HEX (for the emulator too); the ESP32 gets a .bin, which only uploads use.
    const hex = await readFile(join(buildPath, `${SKETCH_DIR}.ino.hex`), "utf8").catch(() => null);
    if (hex) return { ...result, hex };
    if (existsSync(join(buildPath, `${SKETCH_DIR}.ino.bin`))) return result;
    return { ...result, ok: false, message: "The build finished but didn't write the program file." };
  }

  /**
   * Build for the board, then upload to it (BLD-06). The port must be one the
   * caller checked is plugged in; the serial monitor must already be closed.
   */
  async upload(projectPath: string, port: string, board: HardwareBoard, platform: HostPlatform, onStage?: (stage: "building" | "uploading") => void): Promise<UploadOutcome> {
    const started = this.now();
    const elapsed = () => Math.round(this.now() - started);
    onStage?.("building");
    const build = await this.compile(projectPath, board.fqbn);
    if (!build.ok) return { ok: false, stage: "build", build, log: build.log, durationMs: elapsed() };
    const cli = this.options.cli();
    if (!cli) return { ok: false, stage: "build", build, log: "", durationMs: elapsed() };
    onStage?.("uploading");
    const raw = await this.options.run(
      cli,
      ["upload", "--profile", PROFILE, "--fqbn", board.fqbn, "-p", port, "--input-dir", this.buildPath(projectPath, board.fqbn), "--format", "json", join(projectPath, SKETCH_DIR)],
      180_000,
    );
    // Success: { stdout, stderr }. Failure: { error, output: { stdout, stderr } }.
    const json = parseJson<{ stdout?: string; stderr?: string; error?: string; output?: { stdout?: string; stderr?: string } }>(raw.stdout);
    const log = [json?.stdout, json?.stderr, json?.output?.stdout, json?.output?.stderr, json?.error, raw.stderr].filter((s) => s?.trim()).join("\n").trim() || raw.stdout.trim();
    if (raw.code === 0) return { ok: true, stage: "upload", build, log, durationMs: elapsed() };
    return { ok: false, stage: "upload", build, problem: uploadProblem(log, board.id, platform), log, durationMs: elapsed() };
  }

  async libraries(projectPath: string): Promise<ProfileLibrary[]> {
    const yaml = await readFile(join(projectPath, SKETCH_DIR, SKETCH_PROFILE_FILE), "utf8").catch(() => "");
    return readSketchProfile(yaml, PROFILE).libraries;
  }

  async search(query: string): Promise<LibrarySearchResult> {
    const cli = this.options.cli();
    if (!cli) return { ok: false, message: NO_CLI };
    const q = query.trim().slice(0, 100);
    if (!q) return { ok: true, libraries: [] };
    // Arduino CLI refreshes the index first when it's over an hour old.
    const raw = await this.options.run(cli, ["lib", "search", q, "--omit-releases-details", "--format", "json"], 120_000);
    const json = parseJson<SearchJson>(raw.stdout);
    if (!json) return { ok: false, message: setupProblem(`${raw.stderr}${raw.stdout}`) ?? "The library search didn't work. Try again." };
    const libraries: LibraryInfo[] = [];
    for (const lib of json.libraries ?? []) {
      const latest = lib.latest;
      if (!lib.name || !latest?.version) continue;
      const arch = latest.architectures ?? ["*"];
      if (!arch.some((a) => a === "*" || a.toLowerCase() === "avr")) continue;
      libraries.push({ name: lib.name, version: latest.version, sentence: latest.sentence ?? "", author: latest.author ?? "", website: latest.website || null });
      if (libraries.length >= 50) break;
    }
    return { ok: true, libraries };
  }

  add(projectPath: string, name: string, version?: string): Promise<LibraryChange> {
    return this.editLibraries(projectPath, ["profile", "lib", "add", version ? `${name}@${version}` : name], (json) =>
      (json?.added_libraries ?? []).map(nameOf).filter((n): n is string => Boolean(n)),
    );
  }

  remove(projectPath: string, name: string): Promise<LibraryChange> {
    return this.editLibraries(projectPath, ["profile", "lib", "remove", name], () => []);
  }

  /** One sketch.yaml edit at a time: Arduino CLI rewrites the whole file. */
  private editLibraries(projectPath: string, args: string[], added: (json: ProfileLibJson | null) => string[]): Promise<LibraryChange> {
    const job = this.libraryEdit.then(async (): Promise<LibraryChange> => {
      const cli = this.options.cli();
      if (!cli) return { ok: false, message: NO_CLI };
      const sketchDir = join(projectPath, SKETCH_DIR);
      if (args[2] === "add") {
        const index = await this.options.run(cli, ["lib", "update-index"], 120_000);
        if (index.code !== 0) return { ok: false, message: setupProblem(`${index.stderr}${index.stdout}`) ?? "The library list couldn't be updated. Try again." };
      }
      const raw = await this.options.run(cli, [...args, "--profile", PROFILE, "--sketch-path", sketchDir, "--format", "json"], 120_000);
      if (raw.code !== 0) {
        const said = `${raw.stderr}\n${raw.stdout}`.trim();
        const notFound = /not found|no library|not present/i.test(said);
        return { ok: false, message: setupProblem(said) ?? (notFound ? `There's no library called “${args[3].split("@")[0]}” in the Arduino library index.` : said.split("\n")[0] || "That didn't work. Try again.") };
      }
      return { ok: true, libraries: await this.libraries(projectPath), added: added(parseJson<ProfileLibJson>(raw.stdout)) };
    });
    this.libraryEdit = job.catch(() => undefined);
    return job;
  }
}
