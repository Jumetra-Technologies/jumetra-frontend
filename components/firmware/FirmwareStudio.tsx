"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getFirmwareWsUrl } from "@/lib/api-client";
import { openAuthenticatedWebSocket } from "@/lib/ws-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function FirmwareStudio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadDone, setUploadDone] = useState(false);
  const [port, setPort] = useState("COM3");
  const [name, setName] = useState("Blink Demo");
  const [board, setBoard] = useState("esp32");
  const [template, setTemplate] = useState("blink");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [rightTab, setRightTab] = useState<"build" | "serial" | "tools" | "memory">("build");
  const [gpio, setGpio] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const tree = useMemo(() => project?.tree || {}, [project]);

  const refreshProjects = useCallback(async () => {
    const res = await api.listFirmwareProjects();
    setProjects((res.projects as Project[]) || []);
  }, []);

  const openProject = useCallback(async (id: string) => {
    try {
      const p = (await api.getFirmwareProject(id)) as Project;
      setProject(p);
      setError("");
      const first = p.files?.[0];
      if (first) {
        setActivePath(first.path);
        setContent(first.content);
        setDirty(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open project");
    }
  }, []);

  const bootStudio = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const [projectsRes, templatesRes] = await Promise.all([
        api.listFirmwareProjects(),
        api.listFirmwareTemplates(),
      ]);
      setProjects((projectsRes.projects as Project[]) || []);
      setTemplates((templatesRes.templates as Array<{ id: string; name: string }>) || []);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Cannot reach HHIP API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootStudio();
  }, [bootStudio]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    void openAuthenticatedWebSocket(getFirmwareWsUrl())
      .then((socket) => {
        if (cancelled) {
          socket.close();
          return;
        }
        ws = socket;
        socket.onmessage = (ev) => {
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
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, []);

  async function createProject() {
    setError("");
    try {
      const created = (await api.createFirmwareProject({
        name,
        board_type: board,
        template_id: template,
        project_type: board.startsWith("raspberry-pi-4") ? "raspberry-pi" : "arduino-sketch",
      })) as Project;
      await refreshProjects();
      await openProject(created.project_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
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
    if (!project) return;
    try {
      if (dirty) await saveFile();
      setRightTab("build");
      const res = (await api.buildFirmware({ project_id: project.project_id, use_cache: false })) as BuildInfo;
      setBuild(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compile failed");
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted">
        Loading Embedded Studio…
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-background px-4 text-center text-sm">
        <p className="max-w-md text-danger">{apiError}</p>
        <p className="text-muted">Ensure the HHIP API is running on port 8000, then retry.</p>
        <Button size="sm" onClick={() => void bootStudio()}>
          Retry connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <span className="text-sm font-semibold">Embedded Studio</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button size="sm" className="h-7 text-[11px]" disabled={!project} onClick={() => void compile()}>
            Compile
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-[11px]" disabled={!project} onClick={() => void upload()}>
            Upload
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={!dirty} onClick={() => void saveFile()}>
            Save
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border">
          <div className="space-y-1 border-b border-border p-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-[11px]" placeholder="Project name" />
            <select
              className="h-7 w-full rounded border border-border bg-surface px-1 text-[11px]"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
            >
              {[
                "esp32",
                "esp8266",
                "arduino-uno",
                "arduino-mega",
                "stm32",
                "raspberry-pi-pico",
                "raspberry-pi-4",
                "teensy",
                "nrf52",
                "microbit",
              ].map((b) => (
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
            <Button size="sm" className="h-7 w-full text-[11px]" onClick={() => void createProject()}>
              New Project
            </Button>
            {error && <p className="text-[10px] text-danger">{error}</p>}
          </div>
          <div className="max-h-32 overflow-auto border-b border-border p-1">
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
