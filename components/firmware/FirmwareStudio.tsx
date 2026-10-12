"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogIn, RefreshCw } from "lucide-react";
import { api, getFirmwareWsUrl } from "@/lib/api-client";
import { openAuth } from "@/lib/account-dialogs";
import { SignInNeeded, withSignIn } from "@/lib/auth-recovery";
import { useAuthStore } from "@/lib/auth-store";
import { BOARDS, BUILT_IN_TEMPLATES, SLOW_AFTER_MS, loadProjects, loadTemplates, preloadEditor, readCache, type ProjectSummary, type Template } from "@/lib/firmware/studio-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { ProjectExplorer } from "./ProjectExplorer";
import { CodeEditor } from "./CodeEditor";
import { BuildOutput } from "./BuildOutput";
import { SerialMonitorPanel } from "./SerialMonitor";
import { ToolchainManagerPanel } from "./ToolchainManager";
import { UploadProgress } from "./UploadProgress";
import { MemoryUsagePanel } from "./MemoryUsagePanel";
import { cn } from "@/lib/utils";

type Project = {
  project_id: string;
  name: string;
  board_type: string;
  project_type: string;
  files?: Array<{ path: string; content: string; language?: string }>;
  tree?: Record<string, string[]>;
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

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

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
  const [uploadDone, setUploadDone] = useState(false);
  const [port, setPort] = useState("COM3");
  const [name, setName] = useState("Blink Demo");
  const [board, setBoard] = useState("esp32");
  const [template, setTemplate] = useState("blink");
  const cached = useMemo(readCache, []);
  const [templates, setTemplates] = useState<Template[]>(cached?.templates ?? BUILT_IN_TEMPLATES);
  const [rightTab, setRightTab] = useState<"build" | "serial" | "tools" | "memory">("build");
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
   * probably starting up (it's a Firebase function that sleeps when idle).
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
          setConnection({ state: "offline", message: errorText(err, "Cannot reach the Kiungo API.") });
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
        setError(errorText(err, `Failed to ${action}`));
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
            setUploadMsg(String(p.message || ""));
          }
          if (t === "UPLOAD_COMPLETED") {
            setUploadPct(100);
            setUploadDone(true);
            setUploadMsg(p.success ? "Upload completed" : "Upload failed");
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
      setError(err instanceof Error ? err.message : "Save failed");
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
      setBuild({ logs: [`Build ${job.status} · ${job.job_id}`] });

      while (job.status === "queued" || job.status === "running") {
        if (Date.now() >= deadline) {
          throw new Error("Build is still running. Check the job again shortly.");
        }
        await wait(500);
        job = await api.getBackgroundJob(queued.job_id);
        if (job.status === "queued" || job.status === "running") {
          setBuild({ logs: [`Build ${job.status} · ${job.job_id}`] });
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
      setError(err instanceof Error ? err.message : "Compile failed");
    } finally {
      setBuildBusy(false);
    }
  }

  async function upload() {
    if (!project) return;
    try {
      setUploadPct(0);
      setUploadDone(false);
      setUploadMsg("Starting…");
      const res = await api.uploadFirmware({ project_id: project.project_id, port });
      setUploadPct(100);
      setUploadDone(Boolean(res.success));
      setUploadMsg(res.success ? "Verified · board reset · reconnect" : "Upload failed");
      const serial = await api.getFirmwareSerial({ limit: 20 });
      setGpio((serial.gpio as Array<Record<string, unknown>>) || []);
      setError("");
    } catch (err) {
      setUploadDone(true);
      setUploadMsg("Upload failed");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function openFile(path: string) {
    const f = project?.files?.find((x) => x.path === path);
    if (!f) return;
    setActivePath(path);
    setContent(f.content);
    setDirty(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <span className="text-sm font-semibold">Embedded Studio</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button size="sm" className="h-7 text-[11px]" disabled={!project || buildBusy} onClick={() => void compile()}>
            {buildBusy ? "Building…" : "Compile"}
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-[11px]" disabled={!project} onClick={() => void upload()}>
            Upload
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={!dirty} onClick={() => void saveFile()}>
            Save
          </Button>
        </div>
      </header>

      <ConnectionBar connection={connection} onRetry={retry} />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border">
          <div className="space-y-1 border-b border-border p-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-[11px]" placeholder="Project name" />
            <select
              className="h-7 w-full rounded border border-border bg-surface px-1 text-[11px]"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
            >
              {BOARDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              className="h-7 w-full rounded border border-border bg-surface px-1 text-[11px]"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button size="sm" className="h-7 w-full text-[11px]" onClick={createProject} data-testid="new-project">
              New Project
            </Button>
            {error && (
              <p role="alert" className="text-[10px] text-danger">
                {error}
              </p>
            )}
            {signIn && <SignInPrompt need={signIn} />}
          </div>
          <div className="max-h-32 overflow-auto border-b border-border p-1" data-testid="project-list">
            {!projectsReady && connection.state !== "offline" && connection.state !== "sign-in" ? (
              <SkeletonRegion label="Loading projects" className="space-y-1 p-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
              </SkeletonRegion>
            ) : null}
            {projectsReady && projects.length === 0 && connection.state === "online" ? <p className="px-2 py-1 text-[10px] text-muted">No projects yet.</p> : null}
            {projects.map((p) => (
              <button
                key={p.project_id}
                type="button"
                className={cn(
                  "block w-full truncate rounded px-2 py-1 text-left text-[11px] hover:bg-muted-bg",
                  project?.project_id === p.project_id && "bg-accent",
                )}
                onClick={() => void openProject(p.project_id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <ProjectExplorer tree={tree} activePath={activePath} onOpen={openFile} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-[11px]">
            <span className="font-mono text-muted">{activePath || "No file"}</span>
            {dirty && <span className="text-amber-600">• unsaved</span>}
            <Input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="ml-auto h-6 w-24 text-[10px]"
              placeholder="COM /dev"
            />
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
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Create or open a firmware project to start coding.
              </div>
            )}
          </div>
          <div className="h-40 border-t border-border">
            <div className="flex gap-1 border-b border-border p-1 text-[10px]">
              {(
                [
                  ["build", "Build"],
                  ["serial", "Serial"],
                  ["tools", "Toolchains"],
                  ["memory", "Memory"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
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
            <div className="h-[calc(100%-28px)]">
              {rightTab === "build" && (
                <BuildOutput
                  logs={build?.logs || []}
                  warnings={build?.warnings}
                  errors={build?.errors}
                  buildTimeMs={build?.build_time_ms}
                />
              )}
              {rightTab === "serial" && <SerialMonitorPanel />}
              {rightTab === "tools" && <ToolchainManagerPanel />}
              {rightTab === "memory" && (
                <MemoryUsagePanel memory={build?.memory as never} binarySize={build?.binary_size_bytes} />
              )}
            </div>
          </div>
        </main>

        <aside className="flex w-56 shrink-0 flex-col gap-2 border-l border-border p-2">
          <UploadProgress percent={uploadPct} message={uploadMsg} done={uploadDone} failed={uploadMsg.includes("fail")} />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted">GPIO Debug</p>
            <ul className="max-h-48 space-y-1 overflow-auto font-mono text-[10px]">
              {gpio.length === 0 && <li className="text-muted">Live pin updates from firmware logs</li>}
              {gpio.map((g, i) => (
                <li key={i}>
                  {String(g.pin)} = {String(g.logic || g.value)}
                </li>
              ))}
            </ul>
          </div>
          {project && (
            <div className="text-[10px] text-muted">
              <p>{project.board_type}</p>
              <p>{project.project_type}</p>
              <p className="font-mono">{project.project_id}</p>
            </div>
          )}
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
      ? "Connecting to the Kiungo server…"
      : connection.state === "slow"
        ? "The Kiungo server is waking up. After it has been idle this can take up to half a minute."
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
