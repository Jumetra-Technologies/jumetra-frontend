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

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CloudOff, Copy, Download, FilePlus2, FileUp, FolderKanban, FolderOpen, Link2, Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import { partHref } from "@kiungo/core/parts";
import { SESSION_FILE_EXTENSION } from "@kiungo/core/lab/session-file";
import type { LabSession } from "@kiungo/core/lab/types";
import type { MenuEntry } from "@kiungo/ui/menu";
import { cn } from "@kiungo/ui/cn";
import type { LabHost, RuntimeStatus } from "@kiungo/lab/lab-context";
import { LabWorkspace, type TitleMenuApi } from "@kiungo/lab/LabWorkspace";
import { useActiveSession, useLab } from "@kiungo/lab/store";
import { openAuth } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { backendReachable, reconcile } from "@/lib/lab/runtime";
import { useProjects } from "@/lib/projects/workspace";
import { RealHardware } from "./RealHardware";

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

  // The website's lab is the preview (SIM-12): your own code, real boards and robot worlds run in the desktop app.
  const desktopChip = (
    <Link href="/#desktop" className="hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted hover:bg-muted-bg hover:text-foreground xl:inline-flex" title="Run your own code, use real boards and drive robots in the desktop app" data-testid="desktop-chip">
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

  return (
    <LabWorkspace
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
}
