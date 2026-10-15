"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Cpu, FlaskConical, Hammer, Info, LogIn, RefreshCw, Save, Upload } from "lucide-react";
import { api, getFirmwareWsUrl } from "@/lib/api-client";
import { openAuth } from "@/lib/account-dialogs";
import { SignInNeeded, withSignIn } from "@/lib/auth-recovery";
import { useAuthStore } from "@/lib/auth-store";
import { BUILT_IN_TEMPLATES, SLOW_AFTER_MS, loadProjects, loadTemplates, preloadEditor, readCache, type ProjectSummary, type Template } from "@/lib/firmware/studio-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { ProjectExplorer } from "./ProjectExplorer";
import { CodeEditor } from "./CodeEditor";
import { BuildOutput } from "./BuildOutput";
import { SerialMonitorPanel } from "./SerialMonitor";
import { ToolchainManagerPanel } from "./ToolchainManager";
import { UploadProgress, type UploadOutcome } from "./UploadProgress";
import { FIRMWARE_BOARDS, STARTERS, boardName, labBuildFor, projectKind } from "@/lib/firmware/boards";
import { openStarterInLab } from "@/lib/firmware/lab-handoff";
import { MemoryUsagePanel } from "./MemoryUsagePanel";
import { cn } from "@/lib/utils";

type Project = {
  project_id: string;
  name: string;
  board_type: string;
  project_type: string;
  files?: Array<{ path: string; content: string; language?: string }>;
  tree?: Record<string, string[]>;
  template_id?: string;
};

type BuildInfo = {
  success?: boolean;
  logs?: string[];
  warnings?: string[];
  errors?: string[];
  build_time_ms?: number;
  memory?: Record<string, number>;
  binary_size_bytes?: number;
  build_id?: string;
  /** The server had no compiler for the board: files were checked, the code wasn't compiled. */
  dry_run?: boolean;
};

/** What each upload outcome means, in words. A simulated upload never claims the board was flashed. */
const UPLOAD_MESSAGE: Record<UploadOutcome, string> = {
  idle: "",
  running: "Uploading…",
  flashed: "Flashed and verified. The board has restarted with your program.",
  simulated: "Simulated: no board was flashed. Kiungo has no board or flasher connected for this yet, so it went through the steps without sending anything.",
  failed: "The upload didn't finish. Compile first, then check the port.",
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * Where the studio stands with the Kiungo API. The page never waits on this:
 * it paints first and the bar under the header says what's happening.
 */
type Connection =
  | { state: "connecting" }
  | { state: "slow" }
  | { state: "online" }
  | { state: "offline"; message: string }
  | { state: "sign-in"; message: string };


export function FirmwareStudio() {
  const [projects, setProjects] = useState<ProjectSummary[]>(() => readCache()?.projects ?? []);
  const [project, setProject] = useState<Project | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [buildBusy, setBuildBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome>("idle");
  const [port, setPort] = useState("");
  const [name, setName] = useState("My first sketch");
  const [board, setBoard] = useState("arduino-uno");
  const router = useRouter();
  const [template, setTemplate] = useState("blink");
  const cached = useMemo(readCache, []);
  const [templates, setTemplates] = useState<Template[]>(cached?.templates ?? BUILT_IN_TEMPLATES);
  const [rightTab, setRightTab] = useState<"build" | "serial" | "tools" | "memory">("build");
  /** Starter each project was made from, by project id (the server doesn't always say). */
  const [starterOf, setStarterOf] = useState<Record<string, string>>({});
  const [gpio, setGpio] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState<SignInNeeded | null>(null);
  const [connection, setConnection] = useState<Connection>({ state: "connecting" });
  const [projectsReady, setProjectsReady] = useState(Boolean(cached));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const retryAfterSignIn = useRef<(() => void) | null>(null);
  const boot = useRef(0);

  const tree = useMemo(() => project?.tree || {}, [project]);

  const refreshProjects = useCallback(async () => {
    setProjects(await loadProjects());
    setProjectsReady(true);
  }, []);

  /**
   * Load the project and template lists side by side, in the background.
   * Each list lands as soon as it arrives; a failure in one doesn't blank
   * the other. After a few seconds with no answer, say the server is
   * probably starting up after being idle.
   */
  const connect = useCallback(() => {
    const id = ++boot.current;
    const live = () => boot.current === id;
    const slow = window.setTimeout(() => {
      if (live()) setConnection((c) => (c.state === "connecting" ? { state: "slow" } : c));
    }, SLOW_AFTER_MS);

    const projectsDone = loadProjects().then(
      (list) => {
        if (!live()) return;
        setProjects(list);
        setProjectsReady(true);
        setSignIn(null);
      },
      (err: unknown) => {
        if (!live()) return;
        if (err instanceof SignInNeeded || (err instanceof Error && /failed: 40[13]$/.test(err.message))) {
          setConnection({ state: "sign-in", message: "Sign in to see your firmware projects." });
        } else {
          setConnection({ state: "offline", message: describeError(err, "Your firmware projects couldn't be loaded") });
        }
        throw err;
      },
    );
    const templatesDone = loadTemplates().then((list) => {
      if (live()) setTemplates(list);
    });

    void Promise.allSettled([projectsDone, templatesDone]).then((results) => {
      window.clearTimeout(slow);
      if (!live()) return;
      if (results[0].status === "fulfilled") setConnection({ state: "online" });
    });
  }, []);

  const retry = useCallback(() => {
    setConnection({ state: "connecting" });
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    void preloadEditor();
    return () => {
      boot.current += 1;
    };
  }, [connect]);

  // Something needed a sign-in; once it arrives, do it (guarded() clears the prompt).
  useEffect(() => {
    if (!isAuthenticated || !retryAfterSignIn.current) return;
    const again = retryAfterSignIn.current;
    retryAfterSignIn.current = null;
    again();
  }, [isAuthenticated]);

  /** Run an API call that may need the user signed in; on 401 show Log in instead of a bare error. */
  const guarded = useCallback(async (action: string, call: () => Promise<void>, retry: () => void) => {
    setError("");
    setSignIn(null);
    try {
      await withSignIn(action, call);
    } catch (err) {
      if (err instanceof SignInNeeded) {
        retryAfterSignIn.current = retry;
        setSignIn(err);
      } else {
        setError(describeError(err, `Couldn't ${action}`));
      }
    }
  }, []);

  const openProject = useCallback(
    (id: string) =>
      guarded(
        "open the project",
        async () => {
          const p = (await api.getFirmwareProject(id)) as Project;
          setProject(p);
          const first = p.files?.[0];
          if (first) {
            setActivePath(first.path);
            setContent(first.content);
            setDirty(false);
          }
        },
        () => void openProject(id),
      ),
    [guarded],
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(getFirmwareWsUrl());
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const t = msg.type || msg.event;
          const p = msg.payload || {};
          if (t === "UPLOAD_PROGRESS") {
            setUploadPct(Number(p.percent || 0));
            setUploadOutcome("running");
            setUploadMsg(String(p.message || ""));
          }
          if (t === "UPLOAD_COMPLETED") {
            setUploadPct(100);
            const outcome: UploadOutcome = !p.success ? "failed" : p.dry_run ? "simulated" : "flashed";
            setUploadOutcome(outcome);
            setUploadMsg(UPLOAD_MESSAGE[outcome]);
          }
          if (t === "GPIO_DEBUG") {
            setGpio((prev) => [...prev.slice(-20), p]);
          }
          if (t === "BUILD_COMPLETED" || t === "BUILD_FAILED") {
            setBuild(p as BuildInfo);
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      return;
    }
    return () => ws?.close();
  }, []);

  function createProject() {
    void guarded(
      "create a firmware project",
      async () => {
        const created = (await api.createFirmwareProject({
          name,
          board_type: board,
          template_id: template,
          project_type: board.startsWith("raspberry-pi-4") ? "raspberry-pi" : "arduino-sketch",
        })) as Project;
        setStarterOf((m) => ({ ...m, [created.project_id]: template }));
        await refreshProjects();
        await openProject(created.project_id);
      },
      createProject,
    );
  }

  async function saveFile() {
    if (!project || !activePath) return;
    try {
      const updated = (await api.saveFirmwareFile(project.project_id, {
        path: activePath,
        content,
      })) as Project;
      setProject({ ...updated, tree: project.tree });
      setDirty(false);
      const full = await api.getFirmwareProject(project.project_id);
      setProject(full as Project);
      setError("");
    } catch (err) {
      setError(describeError(err, "Your file wasn't saved"));
    }
  }

  async function compile() {
    if (!project || buildBusy) return;
    setBuildBusy(true);
    setRightTab("build");
    setBuild({ logs: ["Submitting build job…"] });
    setError("");
    try {
      if (dirty) await saveFile();
      const queued = await api.queueFirmwareBuild({ project_id: project.project_id, use_cache: false });
      const deadline = Date.now() + 10 * 60 * 1000;
      let job = queued;
      setBuild({ logs: [`Build ${job.status}…`] });

      while (job.status === "queued" || job.status === "running") {
        if (Date.now() >= deadline) {
          throw new Error("Build is still running. Check the job again shortly.");
        }
        await wait(500);
        job = await api.getBackgroundJob(queued.job_id);
        if (job.status === "queued" || job.status === "running") {
          setBuild({ logs: [`Build ${job.status}…`] });
        }
      }

      if (job.status === "succeeded") {
        setBuild(job.result as BuildInfo);
      } else {
        const message = job.error || "Firmware build failed";
        setBuild({ success: false, errors: [message] });
        setError(message);
      }
    } catch (err) {
      setError(describeError(err, "The build didn't finish"));
    } finally {
      setBuildBusy(false);
    }
  }

  async function upload() {
    if (!project) return;
    try {
      setUploadPct(0);
      setUploadOutcome("running");
      setUploadMsg("Starting…");
      const res = await api.uploadFirmware({ project_id: project.project_id, port: port.trim() || undefined });
      const outcome: UploadOutcome = !res.success ? "failed" : res.dry_run ? "simulated" : "flashed";
      setUploadPct(100);
      setUploadOutcome(outcome);
      setUploadMsg(UPLOAD_MESSAGE[outcome]);
      try {
        const serial = await api.getFirmwareSerial({ limit: 20 });
        setGpio((serial.gpio as Array<Record<string, unknown>>) || []);
      } catch {
        /* pin activity is a bonus */
      }
      setError("");
    } catch (err) {
      setUploadOutcome("failed");
      setUploadMsg(UPLOAD_MESSAGE.failed);
      setError(describeError(err, "The upload didn't finish"));
    }
  }

  function tryInLab() {
    if (!project) return;
    const id = openStarterInLab(project.name, project.board_type, starterId);
    router.push(`/laboratory/workspace?session=${encodeURIComponent(id)}`);
  }

  function openFile(path: string) {
    const f = project?.files?.find((x) => x.path === path);
    if (!f) return;
    setActivePath(path);
    setContent(f.content);
    setDirty(false);
  }

  const starterId = (project && (starterOf[project.project_id] ?? project.template_id)) || template;
  const built = !!build && build.success !== undefined;
  // "Simulated" steps count as passed, but in amber: nothing real happened.
  const steps: Array<{ label: string; done: boolean; simulated?: boolean }> = [
    { label: "Start a project", done: !!project },
    { label: "Write and save", done: !!project && !dirty },
    { label: "Compile", done: built && !!build?.success, simulated: built && !!build?.success && !!build?.dry_run },
    { label: "Run it", done: uploadOutcome === "flashed" || uploadOutcome === "simulated", simulated: uploadOutcome === "simulated" },
  ];
  const labBuild = project ? labBuildFor(project.board_type, starterId) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold leading-5">Firmware</h1>
          <p className="truncate text-[12px] text-muted">Write the code that runs on a board, compile it, then run it on a board or in the Engineering Lab.</p>
        </div>
        <ol className="hidden items-center gap-1 xl:flex" aria-label="Steps" data-testid="firmware-steps">
          {steps.map((step, i) => {
            const current = !step.done && steps.slice(0, i).every((x) => x.done);
            return (
              <li key={step.label} className="flex items-center gap-1" data-done={step.done ? "true" : undefined} data-simulated={step.simulated ? "true" : undefined}>
                {i ? <span className="h-px w-3 bg-border" aria-hidden /> : null}
                <span
                  className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium", step.simulated ? "bg-warning/15 text-warning" : step.done ? "bg-success/12 text-success" : current ? "bg-accent text-primary" : "text-muted")}
                  title={step.simulated ? "Simulated: nothing real happened on this step" : undefined}
                >
                  {step.simulated ? <Info className="size-3.5" aria-hidden /> : step.done ? <CheckCircle2 className="size-3.5" aria-hidden /> : <span className="flex size-3.5 items-center justify-center rounded-full border border-current text-[9px]">{i + 1}</span>}
                  {step.label}
                  {step.simulated ? <span className="sr-only"> (simulated)</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[12px]" disabled={!dirty} onClick={() => void saveFile()} title="Save the file you're editing">
            <Save className="size-3.5" aria-hidden /> Save
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-[12px]" disabled={!project || buildBusy} onClick={() => void compile()} title="Turn your code into a program the board can run">
            <Hammer className="size-3.5" aria-hidden /> {buildBusy ? "Compiling…" : "Compile"}
          </Button>
          <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-[12px]" disabled={!project} onClick={() => void upload()} title="Send the compiled program to a board connected to Kiungo online">
            <Upload className="size-3.5" aria-hidden /> Upload
          </Button>
        </div>
      </header>

      <ConnectionBar connection={connection} onRetry={retry} />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
          <div className="space-y-2 border-b border-border p-3" data-testid="new-project-form">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Start a project</p>
            <label className="block text-[12px]">
              <span className="mb-0.5 block text-muted">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-[12.5px]" placeholder="Project name" />
            </label>
            <label className="block text-[12px]">
              <span className="mb-0.5 block text-muted">Board</span>
              <select className="h-8 w-full rounded-[8px] border border-border bg-surface px-2 text-[12.5px]" value={board} onChange={(e) => setBoard(e.target.value)} aria-label="Board">
                {FIRMWARE_BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {boardName(b)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px]">
              <span className="mb-0.5 block text-muted">Starter code</span>
              <select className="h-8 w-full rounded-[8px] border border-border bg-surface px-2 text-[12.5px]" value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="Starter code">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {STARTERS[template] ? <span className="mt-1 block text-[11.5px] leading-4 text-muted" data-testid="starter-does">{STARTERS[template].does}</span> : null}
            </label>
            <Button size="sm" className="h-8 w-full text-[12.5px]" onClick={createProject} data-testid="new-project">
              New project
            </Button>
            {error && <ErrorNotice message={error} size="sm" />}
            {signIn && <SignInPrompt need={signIn} />}
          </div>
          <p className="px-3 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Your projects</p>
          <div className="max-h-40 overflow-auto px-1.5 pb-2 pt-1" data-testid="project-list">
            {!projectsReady && connection.state !== "offline" && connection.state !== "sign-in" ? (
              <SkeletonRegion label="Loading projects" className="space-y-1 p-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
              </SkeletonRegion>
            ) : null}
            {projectsReady && projects.length === 0 && connection.state === "online" ? <p className="px-1.5 py-1 text-[11.5px] text-muted">None yet. Start one above.</p> : null}
            {projects.map((p) => (
              <button
                key={p.project_id}
                type="button"
                className={cn("block w-full rounded-[8px] px-2 py-1.5 text-left hover:bg-muted-bg", project?.project_id === p.project_id && "bg-accent")}
                onClick={() => void openProject(p.project_id)}
              >
                <span className="block truncate text-[12.5px] font-medium">{p.name}</span>
                <span className="block truncate text-[11px] text-muted">{boardName(p.board_type)}</span>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 border-t border-border">
            <ProjectExplorer tree={tree} activePath={activePath} onOpen={openFile} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[12px]">
            <span className="font-mono text-muted">{activePath || "No file open"}</span>
            {dirty && <span className="text-warning">• unsaved</span>}
            {project ? <span className="ml-auto truncate text-muted">{boardName(project.board_type)} · {projectKind(project.project_type)}</span> : null}
          </div>
          <div className="min-h-0 flex-1">
            {project && activePath ? (
              <CodeEditor
                value={content}
                path={activePath}
                onChange={(v) => {
                  setContent(v);
                  setDirty(true);
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6" data-testid="firmware-intro">
                <div className="max-w-md text-[13px] leading-6 text-muted">
                  <Cpu className="mb-2 size-6 text-primary" aria-hidden />
                  <p className="text-[15px] font-semibold text-foreground">Firmware is the program a board runs.</p>
                  <p className="mt-1">An Arduino or ESP32 does nothing until you give it a program. Here you write that program in C++, the same as in the Arduino IDE.</p>
                  <ol className="mt-3 list-decimal space-y-1 pl-5">
                    <li>
                      <span className="text-foreground">Start a project</span> on the left: pick your board and a starter, such as Blink.
                    </li>
                    <li>
                      <span className="text-foreground">Change the code</span> and press Save.
                    </li>
                    <li>
                      <span className="text-foreground">Compile</span> to check it and turn it into a program.
                    </li>
                    <li>
                      <span className="text-foreground">Run it</span>: watch the starter in the Engineering Lab, or read your real board&apos;s output under Serial monitor.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          <div className="h-48 border-t border-border">
            <div className="flex gap-1 border-b border-border p-1 text-[11.5px]" role="tablist" aria-label="Output">
              {(
                [
                  ["build", "Compiler messages"],
                  ["serial", "Serial monitor"],
                  ["memory", "Memory"],
                  ["tools", "Compilers"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={rightTab === id}
                  className={cn(
                    "rounded px-2 py-1",
                    rightTab === id ? "bg-accent text-primary" : "text-muted",
                  )}
                  onClick={() => setRightTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="h-[calc(100%-33px)]">
              {rightTab === "build" && (
                <BuildOutput
                  logs={build?.logs || []}
                  warnings={build?.warnings}
                  errors={build?.errors}
                  buildTimeMs={build?.build_time_ms}
                  success={build?.success}
                  simulated={!!build?.dry_run}
                />
              )}
              {rightTab === "serial" && <SerialMonitorPanel />}
              {rightTab === "tools" && <ToolchainManagerPanel />}
              {rightTab === "memory" && (
                <MemoryUsagePanel memory={build?.memory as never} binarySize={build?.binary_size_bytes} simulated={!!build?.dry_run} />
              )}
            </div>
          </div>
        </main>

        <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-surface p-3" aria-label="Run it">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Run it</p>

          <section className="rounded-[10px] border border-border p-2.5" data-testid="try-in-lab">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <FlaskConical className="size-3.5 text-primary" aria-hidden /> In the Engineering Lab
            </p>
            <p className="mt-1 text-[11.5px] leading-4 text-muted">
              {labBuild
                ? `Opens ${/^[AEIOU]/i.test(boardName(labBuild.board)) ? "an" : "a"} ${boardName(labBuild.board)}${labBuild.parts.length ? ` wired to ${labBuild.parts.map((id) => boardName(id).split(/[ ,(]/)[0]).join(" and ")}` : ""}, running the lab's own version of this starter. Your edits don't run there yet.`
                : "Open a project to see its starter running on a virtual board."}
            </p>
            <Button size="sm" variant="secondary" className="mt-2 h-7 w-full gap-1 text-[12px]" disabled={!project} onClick={tryInLab}>
              <FlaskConical className="size-3.5" aria-hidden /> Try it in the lab
            </Button>
          </section>

          <section className="space-y-2 rounded-[10px] border border-border p-2.5" data-testid="upload-panel">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <Upload className="size-3.5 text-primary" aria-hidden /> On a board
            </p>
            <p className="text-[11.5px] leading-4 text-muted">Upload sends the program to a board connected to Kiungo online, not to your computer. To see a board on your own computer, use Serial monitor &gt; My board (USB).</p>
            <label className="block text-[11.5px]">
              <span className="mb-0.5 block text-muted">Board port (optional)</span>
              <Input value={port} onChange={(e) => setPort(e.target.value)} className="h-7 font-mono text-[12px]" placeholder="e.g. /dev/ttyUSB0" aria-label="Board port" />
            </label>
            <UploadProgress percent={uploadPct} message={uploadMsg} outcome={uploadOutcome} />
          </section>

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Pin activity</p>
            <ul className="max-h-48 space-y-1 overflow-auto font-mono text-[11px]">
              {gpio.length === 0 && <li className="font-sans text-[11.5px] text-muted">Pins the board switches show here while it runs online.</li>}
              {gpio.map((g, i) => (
                <li key={i}>
                  {String(g.pin)} = {String(g.logic || g.value)}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** One line under the header: connecting, waking the server, offline with Retry, or sign in. */
function ConnectionBar({ connection, onRetry }: { connection: Connection; onRetry: () => void }) {
  if (connection.state === "online") return null;
  const tone = connection.state === "offline" ? "text-danger" : "text-muted";
  const text =
    connection.state === "connecting"
      ? "Connecting…"
      : connection.state === "slow"
        ? "Kiungo is getting ready. After a quiet spell this can take up to half a minute."
        : connection.message;
  return (
    <div role="status" aria-live="polite" data-testid="connection-bar" data-state={connection.state} className={cn("flex shrink-0 items-center gap-2 border-b border-border bg-canvas px-3 py-1 text-[11px]", tone)}>
      {connection.state === "connecting" || connection.state === "slow" ? <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {connection.state === "offline" ? (
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px]" onClick={onRetry}>
          <RefreshCw className="size-3" aria-hidden />
          Retry
        </Button>
      ) : null}
      {connection.state === "sign-in" ? (
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px]" onClick={() => openAuth("login")}>
          <LogIn className="size-3" aria-hidden />
          Log in
        </Button>
      ) : null}
    </div>
  );
}

/** The server wants a signed-in user for this. Says why in plain words and opens sign-in. */
function SignInPrompt({ need }: { need: SignInNeeded }) {
  return (
    <div role="alert" data-testid="sign-in-prompt" className="rounded-[8px] border border-border bg-canvas p-2 text-[10px] leading-4 text-foreground">
      <p>{need.message}</p>
      <Button size="sm" className="mt-1.5 h-6 w-full gap-1 text-[10px]" onClick={() => openAuth(need.reason === "expired" ? "login" : "login")}>
        <LogIn className="size-3" aria-hidden />
        {need.reason === "expired" ? "Log in again" : "Log in"}
      </Button>
    </div>
  );
}
