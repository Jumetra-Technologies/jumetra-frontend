"use client";

/**
 * The website's Engineering Lab: the shared lab (`@kiungo/lab`) with what only
 * the website has around it. A session can be linked to a project; parts link
 * to the Component library.
 *
 * Nobody has to sign in to use it. Signed out, sessions live in this tab's
 * memory and the toolbar offers to sign in to save them; signing in carries
 * them into the account. Signed in, they are kept per account in this browser
 * and synced to the account, and the lab mirrors to Kiungo online for real
 * boards, which the server only does for an account.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { Check, CloudOff, Code2, Copy, Download, FilePlus2, FileUp, FolderKanban, FolderOpen, Link2, Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import type { SessionCode } from "@kiungo/core/lab/code";
import { partHref } from "@kiungo/core/parts";
import { SESSION_FILE_EXTENSION } from "@kiungo/core/lab/session-file";
import type { LabSession } from "@kiungo/core/lab/types";
import type { MenuEntry } from "@kiungo/ui/menu";
import { cn } from "@kiungo/ui/cn";
import type { LabHost, RuntimeStatus } from "@kiungo/lab/lab-context";
import { LabWorkspace, type LabWorkspaceHandle, type TitleMenuApi } from "@kiungo/lab/LabWorkspace";
import { useActiveSession, useLab } from "@kiungo/lab/store";
import { openAuth } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { CodeSkeleton } from "@/components/ui/page-skeletons";
import { clampRatio, CODE_RATIO_STEP, MAX_CODE_RATIO, MIN_CODE_RATIO, readCodeLayout, writeCodeLayout, type CodeLayout } from "@/lib/lab/code-layout";
import { webProgramDriver } from "@/lib/lab/program";
import { backendReachable, reconcile } from "@/lib/lab/runtime";
import type { CodeBuildState } from "./CodePane";
import { useProjects } from "@/lib/projects/workspace";
import { RealHardware } from "./RealHardware";

/** The code pane, loaded only when it is shown: the editor's JavaScript stays out of the lab's first load. */
const CodePane = dynamic(() => import("./CodePane").then((m) => m.CodePane), { ssr: false, loading: () => <CodeSkeleton /> });

const WIDE = "(min-width: 768px)";
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(WIDE).matches : true),
    () => true,
  );
}

/**
 * The session's code (WP-D3): edited here at once, written to the session a
 * moment later (it saves and syncs with the account like the circuit), and
 * read by Run straight from the latest edit.
 */
function useSessionCode(sessionId: string | null, saved: SessionCode | undefined) {
  const [draft, setDraft] = useState<SessionCode | undefined>(saved);
  const latest = useRef<SessionCode | undefined>(saved);
  const pending = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (pending.current === null) return;
    window.clearTimeout(pending.current);
    pending.current = null;
    if (sessionId && latest.current) useLab.getState().setCode(sessionId, latest.current);
  }, [sessionId]);
  // Another session opened, or the account brought a newer copy while nothing was being typed.
  useEffect(() => {
    if (pending.current !== null) return;
    latest.current = saved;
    setDraft(saved);
  }, [sessionId, saved]);
  useEffect(() => flush, [flush]);
  const change = useCallback(
    (code: SessionCode) => {
      latest.current = code;
      setDraft(code);
      if (pending.current !== null) window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        if (sessionId) useLab.getState().setCode(sessionId, code);
      }, 400);
    },
    [sessionId],
  );
  return { draft, latest, change, flush };
}

function relative(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Mirror the open session to Kiungo online while it's reachable, on structural
 * changes only. The server keeps a mirror for an account, so signed out there
 * is nothing to reach and no status to show.
 */
function useRuntimeMirror(session: LabSession | null, signedIn: boolean): RuntimeStatus | undefined {
  const [runtime, setRuntime] = useState<RuntimeStatus>("checking");
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void backendReachable().then((ok) => !cancelled && setRuntime(ok ? "online" : "offline"));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  const shape = session ? `${session.id}|${session.name}|${session.nodes.map((n) => n.id).join(",")}|${session.wires.map((w) => w.id).join(",")}` : "";
  useEffect(() => {
    if (!signedIn || (runtime !== "online" && runtime !== "syncing")) return;
    if (!session) return;
    const current = session;
    const id = window.setTimeout(async () => {
      setRuntime("syncing");
      try {
        const mapping = await reconcile(current);
        if (useLab.getState().activeId === current.id) useLab.getState().setRuntime(mapping);
        setRuntime("online");
      } catch {
        setRuntime("offline");
      }
    }, 1200);
    return () => window.clearTimeout(id);
    // Reconcile on structural changes only (shape), not every position nudge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, signedIn, runtime === "offline" || runtime === "checking"]);
  return signedIn ? runtime : undefined;
}

export function EngineeringLab({ sessionId, newForProject }: { sessionId?: string; newForProject?: string }) {
  const router = useRouter();
  const hydrated = useLab((s) => s.hydrated);
  const saveError = useLab((s) => s.saveError);
  const cloudSaveState = useLab((s) => s.cloudSaveState);
  // A saved sign-in is read by AuthBootstrap in the root layout, before this page's effects run.
  const signedIn = useAuthStore((s) => !!s.user);
  const session = useActiveSession();
  const workspace = useProjects();
  const projects = useMemo(() => workspace?.projects ?? [], [workspace]);
  const projectsReady = workspace?.ready ?? false;
  const runtime = useRuntimeMirror(session, signedIn);

  // ----- open the right session -------------------------------------------------
  const opened = useRef(false);
  useEffect(() => {
    if (!hydrated) useLab.getState().hydrate();
  }, [hydrated]);

  // Signed in with nothing to open, the account's sessions may still be on their way. Give them a moment
  // before starting an empty one, which would be added to the account; a slow server doesn't hold the lab up for long.
  const awaitingAccount = hydrated && signedIn && !session && (cloudSaveState === "idle" || cloudSaveState === "syncing");
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (!awaitingAccount) return;
    const id = window.setTimeout(() => setWaited(true), 2500);
    return () => window.clearTimeout(id);
  }, [awaitingAccount]);

  // Open what the address asks for, once. After that, never leave the lab without a session:
  // deleting the last one, or signing out (which takes the account's sessions away), starts a new one.
  useEffect(() => {
    if (!hydrated) return;
    const state = useLab.getState();
    if (!opened.current) {
      if (newForProject) {
        // The project's name comes from the list, which a signed-in account's is still loading for a moment.
        if (!projectsReady) return;
        const project = projects.find((p) => p.id === newForProject);
        state.createSession({ name: project ? `${project.name} lab` : "Untitled lab", projectId: project?.id ?? null });
        opened.current = true;
        return;
      }
      if (sessionId && state.sessions.some((s) => s.id === sessionId)) {
        state.openSession(sessionId);
        opened.current = true;
        return;
      }
    }
    if (state.activeId && state.sessions.some((s) => s.id === state.activeId)) {
      opened.current = true;
      return;
    }
    if (state.sessions.length) {
      state.openSession(state.sessions[0].id);
      opened.current = true;
      return;
    }
    // Nothing to open.
    if (awaitingAccount && !waited) return;
    state.createSession({ name: opened.current ? "Untitled lab" : "My first lab" });
    opened.current = true;
  }, [hydrated, sessionId, newForProject, projects, projectsReady, session, awaitingAccount, waited]);

  // Keep the URL pointing at the open session, so it can be bookmarked or shared to another tab.
  useEffect(() => {
    if (!session) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("session") === session.id && !url.searchParams.has("project")) return;
    url.searchParams.set("session", session.id);
    url.searchParams.delete("project");
    url.searchParams.delete("workspace");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [session]);

  const host = useMemo<LabHost>(
    () => ({
      renderPartLink: (partId, children, className) => (
        <Link href={partHref(partId)} className={className}>
          {children}
        </Link>
      ),
      openPartPage: (partId) => router.push(partHref(partId)),
      realHardware: <RealHardware signedIn={signedIn} />,
      // Signed out nothing is saved, the log included.
      activityNote: signedIn ? undefined : "Not saved: sign in to keep this log",
    }),
    [router, signedIn],
  );

  const project = session ? (projects.find((p) => p.id === session.projectId) ?? null) : null;

  // ----- Code beside the circuit (WP-D3) -----
  const lab = useRef<LabWorkspaceHandle>(null);
  const wide = useWide();
  const activeId = session?.id ?? null;
  const { draft: code, latest: latestCode, change: changeCode, flush: flushCode } = useSessionCode(activeId, session?.code);
  // The layout and the last build belong to the open session: switching sessions starts from that session's.
  const [perSession, setPerSession] = useState<{ id: string | null; layout: CodeLayout; build: CodeBuildState }>(() => ({ id: activeId, layout: activeId ? readCodeLayout(activeId) : { open: true, ratio: 0.5 }, build: { busy: false, result: null } }));
  if (perSession.id !== activeId) setPerSession({ id: activeId, layout: activeId ? readCodeLayout(activeId) : { open: true, ratio: 0.5 }, build: { busy: false, result: null } });
  const { layout, build } = perSession;
  const setLayout = useCallback(
    (next: CodeLayout) => {
      setPerSession((p) => ({ ...p, layout: next }));
      if (activeId) writeCodeLayout(activeId, next);
    },
    [activeId],
  );
  const setBuild = useCallback((next: CodeBuildState) => setPerSession((p) => ({ ...p, build: next })), []);
  const [mobileTab, setMobileTab] = useState<"circuit" | "code">("circuit");
  const [labRunning, setLabRunning] = useState(false);
  // A new driver when the session gains or loses code, so the lab asks again which board runs it.
  const hasCode = !!code?.files.some((f) => f.path.endsWith(".ino"));
  const program = useMemo(
    () =>
      webProgramDriver({
        code: () => (latestCode.current ? { files: latestCode.current.files } : null),
        onBuildStart: () => setBuild({ busy: true, result: null }),
        onBuild: (result, problem) => setBuild(result ? { busy: false, result } : { busy: false, result: null, [problem?.kind ?? "unavailable"]: problem?.message }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasCode: see above
    [latestCode, hasCode, setBuild],
  );
  // The compile service's free plan sleeps: wake it once there's code to build.
  useEffect(() => {
    if (hasCode) void import("@/lib/lab/compile").then((m) => m.wakeCompiler());
  }, [hasCode]);
  const runCode = useCallback(() => {
    flushCode();
    if (labRunning) {
      lab.current?.stop();
      window.setTimeout(() => lab.current?.run(), 0);
    } else lab.current?.run();
  }, [flushCode, labRunning]);
  const codeOpen = layout.open;
  const toggleCode = useCallback(() => {
    const open = !layout.open;
    setLayout({ ...layout, open });
    if (open && !wide) setMobileTab("code");
  }, [layout, setLayout, wide]);

  const titleMenu = ({ session: current, sessions, rename, openFile, exportJson }: TitleMenuApi): MenuEntry[] => [
    { id: "new", label: "New lab session", icon: <FilePlus2 />, onSelect: () => useLab.getState().createSession({ name: "Untitled lab", projectId: current.projectId }) },
    {
      id: "open",
      label: "Open session",
      icon: <FolderOpen />,
      items: sessions.slice(0, 14).map((s) => ({ id: s.id, label: s.name, hint: `${s.nodes.length} parts · ${relative(s.updatedAt)}`, checked: s.id === current.id, onSelect: () => useLab.getState().openSession(s.id) })),
    },
    { id: "import", label: "Open from file…", icon: <FileUp />, hint: SESSION_FILE_EXTENSION, onSelect: openFile },
    { id: "rename", label: "Rename", icon: <Pencil />, onSelect: rename },
    { id: "dup", label: "Duplicate session", icon: <Copy />, onSelect: () => useLab.getState().duplicateSession(current.id) },
    {
      id: "project",
      label: "Link to project",
      icon: <Link2 />,
      items: [
        { id: "none", label: "No project", checked: !current.projectId, onSelect: () => useLab.getState().linkProject(current.id, null) },
        ...(projects.length ? [{ type: "separator" as const, id: "sep" }] : []),
        ...projects.map((p) => ({ id: p.id, label: p.name, hint: p.category, checked: p.id === current.projectId, onSelect: () => useLab.getState().linkProject(current.id, p.id, p.name) })),
        { type: "separator" as const, id: "sep2" },
        { id: "create", label: "Create a project…", icon: <Plus />, onSelect: () => router.push("/workspace?new=1") },
      ],
    },
    { id: "export", label: "Export as JSON", icon: <Download />, onSelect: exportJson },
    { type: "separator", id: "s1" },
    { id: "projects", label: "All sessions in Projects", icon: <FolderKanban />, onSelect: () => router.push("/workspace") },
    {
      id: "delete",
      label: "Delete session",
      icon: <Trash2 />,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete “${current.name}” and its activity log? This can't be undone.`)) useLab.getState().deleteSession(current.id);
      },
    },
  ];

  // Signed out the lab works in full and nothing is saved: the status is the way to sign in and keep it.
  const saveStatus = signedIn ? (
    <span
      className={cn("hidden items-center gap-1 text-[11.5px] lg:inline-flex", saveError || cloudSaveState === "error" ? "text-danger" : "text-muted")}
      title={saveError ? "This browser's storage is full or blocked." : cloudSaveState === "error" ? "Your local copy remains available, but cloud sync failed. Check your connection and sign in again." : cloudSaveState === "saved" ? "Saved to your account and this device." : "Syncing lab sessions to your account."}
      aria-label={saveError || cloudSaveState === "error" ? "Sync failed" : cloudSaveState === "saved" ? "Saved to your account" : "Syncing"}
      data-testid="save-status"
    >
      {saveError ? (
        "Not saved"
      ) : cloudSaveState === "error" ? (
        "Sync failed"
      ) : (
        <>
          {cloudSaveState === "saved" ? <Check className="size-3.5 text-success" aria-hidden /> : null}
          <span className="hidden 2xl:inline">{cloudSaveState === "saved" ? "Saved to account" : "Syncing…"}</span>
        </>
      )}
    </span>
  ) : (
    <button
      type="button"
      onClick={() => openAuth("login")}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 text-[11.5px] font-medium text-foreground hover:bg-muted-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      title="Not saved: this lab session is gone when you close or reload the page. Sign in to save it to your account."
      aria-label="Not saved. Sign in to save"
      data-testid="save-status"
    >
      <CloudOff className="size-3.5 text-muted" aria-hidden />
      <span className="hidden sm:inline">Not saved</span>
      <span className="hidden text-primary lg:inline">Sign in to save</span>
    </button>
  );

  // Real boards and robot worlds run in the desktop app (SIM-12); your own code runs here too (WP-D2).
  const desktopChip = (
    <Link href="/#desktop" className="hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted hover:bg-muted-bg hover:text-foreground xl:inline-flex" title="Use real boards and drive robots in the desktop app" data-testid="desktop-chip">
      <Monitor className="size-3 shrink-0" aria-hidden />
      Desktop app
    </Link>
  );

  const projectChip = project ? (
    <Link href={`/workspace/projects/${project.id}`} className="hidden max-w-[12rem] items-center gap-1 truncate rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-medium text-primary hover:underline 2xl:inline-flex" title="Open the project">
      <FolderKanban className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{project.name}</span>
    </Link>
  ) : null;

  const codeButton = (
    <button
      type="button"
      onClick={toggleCode}
      aria-pressed={codeOpen}
      aria-label={codeOpen ? "Hide the code" : "Show the code"}
      title={codeOpen ? "Hide the code" : "Code: write the sketch the Uno runs"}
      className={cn("flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-medium transition-colors", codeOpen ? "bg-muted-bg text-foreground" : "text-muted hover:bg-muted-bg")}
      data-testid="code-toggle"
    >
      <Code2 className="size-4" aria-hidden />
      <span className="hidden lg:inline">Code</span>
    </button>
  );

  const labView = (
    <LabWorkspace
      ref={lab}
      program={program}
      onRunningChange={setLabRunning}
      trailing={codeButton}
      menuItems={[{ id: "code", label: codeOpen ? "Hide code" : "Code", icon: <Code2 />, onSelect: toggleCode }]}
      host={host}
      runtime={runtime}
      project={project ? { id: project.id, name: project.name, description: project.description, objectives: project.objectives, hardware: project.hardware, category: project.category } : null}
      projectChip={
        <>
          {projectChip}
          {desktopChip}
        </>
      }
      onLinkProject={() => {
        if (projects.length) return "Use the session menu: Link to project";
        router.push("/workspace?new=1");
      }}
      titleMenu={titleMenu}
      saveStatus={saveStatus}
    />
  );

  if (!codeOpen) return <div className="flex h-full min-h-0 w-full" data-testid="lab-split" data-code="closed">{labView}</div>;

  const pane = <CodePane code={code} onChange={changeCode} build={build} onRun={runCode} onClose={toggleCode} />;

  // Phones: the code is a tab beside the circuit, not a split.
  if (!wide) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col" data-testid="lab-split" data-code="tab">
        <div className="flex h-9 shrink-0 items-stretch gap-1 border-b border-border bg-surface px-2" role="tablist" aria-label="Circuit or code">
          {(["circuit", "code"] as const).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={mobileTab === id} onClick={() => setMobileTab(id)} className={cn("border-b-2 px-3 text-[12.5px] font-medium", mobileTab === id ? "border-primary text-foreground" : "border-transparent text-muted")} data-testid={`lab-tab-${id}`}>
              {id === "circuit" ? "Circuit" : "Code"}
            </button>
          ))}
        </div>
        <div className={cn("min-h-0 flex-1", mobileTab !== "circuit" && "hidden")}>{labView}</div>
        <div className={cn("min-h-0 flex-1", mobileTab !== "code" && "hidden")}>{pane}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full" data-testid="lab-split" data-code="open">
      {/* overflow-hidden: at half width the lab's top bar can't spill over the code. */}
      <div className="h-full min-w-0 overflow-hidden" style={{ width: `${(1 - layout.ratio) * 100}%` }}>
        {labView}
      </div>
      <SplitHandle ratio={layout.ratio} onChange={(ratio) => setLayout({ ...layout, ratio })} />
      <div className="h-full min-w-0 border-l border-border" style={{ width: `${layout.ratio * 100}%` }}>
        {pane}
      </div>
    </div>
  );
}

/** The divider between the circuit and the code: drag it, or focus it and use the arrow keys (Home and End for the limits). */
function SplitHandle({ ratio, onChange }: { ratio: number; onChange: (ratio: number) => void }) {
  const start = (e: ReactPointerEvent<HTMLDivElement>) => {
    const parent = e.currentTarget.parentElement;
    if (!parent) return;
    e.preventDefault();
    const box = parent.getBoundingClientRect();
    const move = (ev: PointerEvent) => onChange(clampRatio((box.right - ev.clientX) / box.width));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the code"
      aria-valuemin={Math.round(MIN_CODE_RATIO * 100)}
      aria-valuemax={Math.round(MAX_CODE_RATIO * 100)}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onPointerDown={start}
      onKeyDown={(e) => {
        const next = e.key === "ArrowLeft" ? ratio + CODE_RATIO_STEP : e.key === "ArrowRight" ? ratio - CODE_RATIO_STEP : e.key === "Home" ? MAX_CODE_RATIO : e.key === "End" ? MIN_CODE_RATIO : null;
        if (next === null) return;
        e.preventDefault();
        onChange(clampRatio(next));
      }}
      className="w-1.5 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none"
      data-testid="code-divider"
    />
  );
}
