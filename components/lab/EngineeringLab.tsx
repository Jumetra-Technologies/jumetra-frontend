"use client";

/**
 * The website's Engineering Lab: the shared lab (`@kiungo/lab`) with what only
 * the website has around it. Sessions are kept per account in this browser
 * and synced to the account; a session can be linked to a project; parts link
 * to the Component library; the lab mirrors to Kiungo online for real boards.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Download, FilePlus2, FileUp, FolderKanban, FolderOpen, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { partHref } from "@kiungo/core/parts";
import { SESSION_FILE_EXTENSION } from "@kiungo/core/lab/session-file";
import type { LabSession } from "@kiungo/core/lab/types";
import type { MenuEntry } from "@kiungo/ui/menu";
import { cn } from "@kiungo/ui/cn";
import type { LabHost, RuntimeStatus } from "@kiungo/lab/lab-context";
import { LabWorkspace, type TitleMenuApi } from "@kiungo/lab/LabWorkspace";
import { useActiveSession, useLab } from "@kiungo/lab/store";
import { useAuthStore } from "@/lib/auth-store";
import { backendReachable, reconcile } from "@/lib/lab/runtime";
import { getServerRoboticsDataSnapshot, readRoboticsData, subscribeToRoboticsData } from "@/lib/robotics-data";
import { RealHardware } from "./RealHardware";

function relative(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Mirror the open session to Kiungo online while it's reachable, on structural changes only. */
function useRuntimeMirror(session: LabSession | null): RuntimeStatus {
  const [runtime, setRuntime] = useState<RuntimeStatus>("checking");
  useEffect(() => {
    let cancelled = false;
    void backendReachable().then((ok) => !cancelled && setRuntime(ok ? "online" : "offline"));
    return () => {
      cancelled = true;
    };
  }, []);
  const shape = session ? `${session.id}|${session.name}|${session.nodes.map((n) => n.id).join(",")}|${session.wires.map((w) => w.id).join(",")}` : "";
  useEffect(() => {
    if (runtime !== "online" && runtime !== "syncing") return;
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
  }, [shape, runtime === "offline" || runtime === "checking"]);
  return runtime;
}

export function EngineeringLab({ sessionId, newForProject }: { sessionId?: string; newForProject?: string }) {
  const router = useRouter();
  const hydrated = useLab((s) => s.hydrated);
  const saveError = useLab((s) => s.saveError);
  const cloudSaveState = useLab((s) => s.cloudSaveState);
  const signedIn = useAuthStore((s) => !!s.user);
  const session = useActiveSession();
  const projectsData = useSyncExternalStore(subscribeToRoboticsData, readRoboticsData, getServerRoboticsDataSnapshot);
  const projects = useMemo(() => projectsData?.projects ?? [], [projectsData]);
  const runtime = useRuntimeMirror(session);

  // ----- open the right session -------------------------------------------------
  const opened = useRef(false);
  useEffect(() => {
    if (!hydrated) useLab.getState().hydrate();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || opened.current) return;
    opened.current = true;
    const state = useLab.getState();
    if (newForProject) {
      const project = readRoboticsData().projects.find((p) => p.id === newForProject);
      state.createSession({ name: project ? `${project.name} lab` : "Untitled lab", projectId: project?.id ?? null });
    } else if (sessionId && state.sessions.some((s) => s.id === sessionId)) {
      state.openSession(sessionId);
    } else if (!state.sessions.length || !state.activeId) {
      state.createSession({ name: "My first lab" });
    }
  }, [hydrated, sessionId, newForProject]);

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
      realHardware: <RealHardware />,
    }),
    [router],
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

  const saveStatus = (
    <span
      className={cn("hidden items-center gap-1 text-[11.5px] lg:inline-flex", saveError || cloudSaveState === "error" ? "text-danger" : "text-muted")}
      title={saveError ? "This browser's storage is full or blocked." : cloudSaveState === "error" ? "Your local copy remains available, but cloud sync failed. Check your connection and sign in again." : signedIn ? cloudSaveState === "saved" ? "Saved to your account and this device." : "Syncing lab sessions to your account." : "Not saved: sign in to sync lab sessions."}
      aria-label={saveError || cloudSaveState === "error" ? "Sync failed" : signedIn ? cloudSaveState === "saved" ? "Saved to your account" : "Syncing" : "Not saved"}
      data-testid="save-status"
    >
      {saveError ? (
        "Not saved"
      ) : cloudSaveState === "error" ? (
        "Sync failed"
      ) : signedIn ? (
        <>
          {cloudSaveState === "saved" ? <Check className="size-3.5 text-success" aria-hidden /> : null}
          <span className="hidden 2xl:inline">{cloudSaveState === "saved" ? "Saved to account" : "Syncing…"}</span>
        </>
      ) : (
        "Not saved"
      )}
    </span>
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
      projectChip={projectChip}
      onLinkProject={() => {
        if (projects.length) return "Use the session menu: Link to project";
        router.push("/workspace?new=1");
      }}
      titleMenu={titleMenu}
      saveStatus={saveStatus}
    />
  );
}
