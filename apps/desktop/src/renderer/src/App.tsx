import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Box, Code2, FilePlus2, FolderOpen, Grid2x2, House, LogIn, LogOut, Maximize, PanelRight, Play, Redo2, Search, Stethoscope, Undo2, UserRound, X, Zap } from "lucide-react";
import type { OpenedProject, OpenResult, RecentProject } from "@kiungo/api";
import { AccountMenu } from "./account/AccountMenu";
import { SignInScreen } from "./account/SignInScreen";
import { useAuth } from "./account/useAuth";
import { Foundations } from "./foundations/Foundations";
import { Home } from "./home/Home";
import { NewProjectDialog } from "./home/NewProjectDialog";
import { invoke, shortcut } from "./ipc";
import { CommandPalette, type Command } from "./palette/CommandPalette";
import { ProjectScreen, type ProjectScreenHandle } from "./project/ProjectScreen";
import { useSystemTheme } from "./theme";

type Screen = { kind: "home" } | { kind: "project"; project: OpenedProject } | { kind: "foundations" };

export function App() {
  useSystemTheme();
  const auth = useAuth();
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [recent, setRecent] = useState<RecentProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState<{ starter: string | null } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The open lab's actions, kept in state (not a ref) so the palette's commands built during render may use them.
  const [lab, setLab] = useState<ProjectScreenHandle | null>(null);
  const openPath = screen.kind === "project" ? screen.project.path : null;

  const refreshRecent = useCallback(() => {
    void invoke("projects:recent").then(setRecent, () => setRecent([]));
  }, []);
  useEffect(() => {
    if (screen.kind === "home") refreshRecent();
  }, [screen.kind, refreshRecent]);

  /** Leave the open project: its last changes are saved before it's let go. */
  const closeOpen = useCallback(async () => {
    if (!openPath) return;
    // Unmount the project now: it sends its last change as it goes, before the close below.
    flushSync(() => setScreen({ kind: "home" }));
    await invoke("projects:close", openPath);
  }, [openPath]);

  const show = useCallback(
    async (result: OpenResult | null) => {
      if (!result) return;
      if (!result.ok) {
        await closeOpen();
        setError(result.message);
        refreshRecent();
        return;
      }
      if (result.project.path === openPath) return;
      await closeOpen();
      setError(null);
      setScreen({ kind: "project", project: result.project });
    },
    [closeOpen, openPath, refreshRecent],
  );

  const goHome = useCallback(() => {
    setError(null);
    void closeOpen();
    setScreen({ kind: "home" });
  }, [closeOpen]);
  const openFolder = useCallback(() => void invoke("projects:open-dialog").then(show), [show]);
  const openRecent = useCallback((p: RecentProject) => void invoke("projects:open-recent", p.path).then(show), [show]);
  const newProject = useCallback((starter: string | null = null) => setNewOpen({ starter }), []);

  // Shortcuts that work everywhere. The lab adds its own (⌘Z, ⌘↵, /, 1–3).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (key === "n" && !e.shiftKey) {
        e.preventDefault();
        newProject();
      } else if (key === "o" && !e.shiftKey) {
        e.preventDefault();
        openFolder();
      } else if (key === "h" && e.shiftKey) {
        e.preventDefault();
        goHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject, openFolder, goHome]);

  // The palette lists recent projects too, so it needs the list on every screen.
  useEffect(() => {
    if (paletteOpen && recent === null) refreshRecent();
  }, [paletteOpen, recent, refreshRecent]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    if (screen.kind === "project") {
      const g = "This project";
      const call = (fn: (l: ProjectScreenHandle) => void) => () => lab && fn(lab);
      list.push(
        { id: "code", title: "Show or hide the code", group: g, icon: <Code2 />, shortcut: shortcut("E"), keywords: "editor sketch ino", run: call((l) => l.toggleCode()) },
        { id: "run", title: "Run or stop", group: g, icon: <Play />, shortcut: shortcut("↵"), keywords: "start simulate", run: call((l) => l.toggleRun()) },
        { id: "parts", title: "Search parts", group: g, icon: <Search />, shortcut: "/", keywords: "add component sensor", run: call((l) => l.focusSearch()) },
        { id: "inspector", title: "Show or hide the Inspector", group: g, icon: <PanelRight />, keywords: "details pins", run: call((l) => l.toggleInspector()) },
        { id: "fit", title: "Fit the circuit to the screen", group: g, icon: <Maximize />, keywords: "zoom", run: call((l) => l.fit()) },
        { id: "view-3d", title: "View in 3D", group: g, icon: <Box />, shortcut: "1", run: call((l) => l.setView("reality")) },
        { id: "view-2d", title: "View in 2D", group: g, icon: <Grid2x2 />, shortcut: "2", run: call((l) => l.setView("top")) },
        { id: "view-trace", title: "View as Trace", group: g, icon: <Zap />, shortcut: "3", keywords: "current flow", run: call((l) => l.setView("flow")) },
        { id: "undo", title: "Undo", group: g, icon: <Undo2 />, shortcut: shortcut("Z"), run: call((l) => l.undo()) },
        { id: "redo", title: "Redo", group: g, icon: <Redo2 />, shortcut: shortcut("Z", { shift: true }), run: call((l) => l.redo()) },
        { id: "import", title: "Open a build file", group: g, icon: <FolderOpen />, keywords: "import json", run: call((l) => l.openFile()) },
        { id: "export", title: "Export the build", group: g, keywords: "save json download", run: call((l) => l.exportJson()) },
        { id: "reveal", title: "Show the project folder", group: g, icon: <FolderOpen />, keywords: "finder explorer files", run: () => void invoke("projects:reveal", screen.project.path) },
        { id: "close", title: "Close project", group: g, icon: <X />, run: goHome },
      );
    }
    list.push(
      { id: "new", title: "New project", group: "Projects", icon: <FilePlus2 />, shortcut: shortcut("N"), keywords: "create starter", run: () => newProject() },
      { id: "open", title: "Open a project folder", group: "Projects", icon: <FolderOpen />, shortcut: shortcut("O"), run: openFolder },
    );
    if (screen.kind !== "home") list.push({ id: "home", title: "Go to Home", group: "Projects", icon: <House />, shortcut: shortcut("H", { shift: true }), run: goHome });
    for (const p of recent ?? []) {
      if (p.missing || p.path === openPath) continue;
      list.push({ id: `recent-${p.path}`, title: p.name ?? p.path, detail: p.boardName ?? undefined, group: "Recent projects", keywords: p.path, run: () => openRecent(p) });
    }
    if (auth?.status === "signed-in") {
      list.push(
        { id: "switch", title: "Switch account", detail: auth.user.email, group: "Account", icon: <UserRound />, run: () => void invoke("auth:sign-out").then(() => invoke("auth:sign-in")) },
        { id: "sign-out", title: "Sign out", detail: "Your projects stay on this computer", group: "Account", icon: <LogOut />, run: () => void invoke("auth:sign-out") },
      );
    } else list.push({ id: "sign-in", title: "Sign in", group: "Account", icon: <LogIn />, run: () => void invoke("auth:sign-in") });
    list.push({ id: "foundations", title: "Check the toolchain and emulator", group: "Help", icon: <Stethoscope />, keywords: "diagnostics arduino cli compiler", run: () => void closeOpen().then(() => setScreen({ kind: "foundations" })) });
    return list;
  }, [screen, lab, recent, openPath, goHome, newProject, openFolder, openRecent, closeOpen, auth]);

  // Signed out, or waiting for the browser: the sign-in screen (DSK-01). Open work is saved first.
  const needsSignIn = auth !== null && (auth.status === "waiting" || (auth.status === "signed-out" && !auth.skipped));
  useEffect(() => {
    if (needsSignIn && openPath) void closeOpen();
  }, [needsSignIn, openPath, closeOpen]);
  if (auth === null) return <div className="h-full bg-background" />;
  if (needsSignIn) return <SignInScreen state={auth as Extract<typeof auth, { status: "signed-out" | "waiting" }>} />;

  return (
    <>
      {screen.kind === "project" ? (
        <ProjectScreen key={screen.project.path} ref={setLab} project={screen.project} onHome={goHome} />
      ) : screen.kind === "foundations" ? (
        <Foundations onHome={goHome} />
      ) : (
        <Home
          recent={recent}
          error={error}
          onNew={newProject}
          onOpenFolder={openFolder}
          onOpen={openRecent}
          onReveal={(p) => void invoke("projects:reveal", p.path)}
          onForget={(p) => void invoke("projects:forget", p.path).then(setRecent)}
          onPalette={() => setPaletteOpen(true)}
          account={<AccountMenu state={auth} />}
        />
      )}
      <NewProjectDialog
        key={newOpen?.starter ?? "none"}
        open={newOpen !== null}
        initialStarter={newOpen?.starter ?? null}
        onClose={() => setNewOpen(null)}
        onCreated={(project) => {
          setNewOpen(null);
          void show({ ok: true, project });
        }}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  );
}
