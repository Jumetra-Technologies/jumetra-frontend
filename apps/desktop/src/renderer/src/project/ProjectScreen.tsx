import { forwardRef, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Download, FileUp, FolderOpen, House, Loader2, Pencil, X } from "lucide-react";
import type { OpenedProject } from "@kiungo/api";
import { SESSION_FILE_EXTENSION } from "@kiungo/core/lab/session-file";
import type { LabSession } from "@kiungo/core/lab/types";
import { boardName } from "@kiungo/core/project";
import type { MenuEntry } from "@kiungo/ui/menu";
import type { LabHost } from "@kiungo/lab/lab-context";
import { LabWorkspace, type LabWorkspaceHandle, type TitleMenuApi } from "@kiungo/lab/LabWorkspace";
import { flushLab, setLabPersistence, useActiveSession, useLab } from "@kiungo/lab/store";
import { invoke, shortcut } from "../ipc";
import { NO_PERSISTENCE, projectPersistence, type SaveState } from "./persistence";

/** The desktop app has no Component library or real boards yet (sprint 6). */
const HOST: LabHost = {};

interface ProjectScreenProps {
  project: OpenedProject;
  onHome: () => void;
}

/** An open project: the lab, saving into the project folder as you work. */
export const ProjectScreen = forwardRef<LabWorkspaceHandle, ProjectScreenProps>(function ProjectScreen({ project, onHome }, ref) {
  const [save, setSave] = useState<SaveState>({ kind: "saved", at: null });
  const [warnings, setWarnings] = useState(project.warnings);
  const session = useActiveSession();

  // The lab reads from and writes to this project while it's open.
  useEffect(() => {
    setLabPersistence(projectPersistence(project, setSave));
    useLab.getState().hydrate();
    const flush = () => flushLab();
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flushLab();
      setLabPersistence(NO_PERSISTENCE);
    };
  }, [project]);

  const name = session?.name ?? project.meta.name;
  useEffect(() => {
    document.title = `${name} – Kiungo`;
    return () => {
      document.title = "Kiungo";
    };
  }, [name]);

  const titleMenu = ({ rename, openFile, exportJson }: TitleMenuApi): MenuEntry[] => [
    { id: "rename", label: "Rename", icon: <Pencil />, onSelect: rename },
    { id: "reveal", label: "Show in folder", icon: <FolderOpen />, onSelect: () => void invoke("projects:reveal", project.path) },
    { type: "separator", id: "s1" },
    { id: "import", label: "Open a build file…", icon: <FileUp />, hint: SESSION_FILE_EXTENSION, onSelect: openFile },
    { id: "export", label: "Export the build", icon: <Download />, hint: SESSION_FILE_EXTENSION, onSelect: exportJson },
    { type: "separator", id: "s2" },
    { id: "close", label: "Close project", icon: <House />, onSelect: onHome },
  ];

  const onOpenBuild = useMemo(
    () => (opened: LabSession, fileName: string) => {
      useLab.getState().replaceBuild(opened, fileName);
      return { name: opened.name, nodes: opened.nodes.length, wires: opened.wires.length };
    },
    [],
  );

  const saveStatus =
    save.kind === "error" ? (
      <button type="button" onClick={() => flushLab()} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium text-danger hover:bg-muted-bg" title={`${save.message} Click to try again.`} data-testid="save-status">
        <AlertTriangle className="size-3.5" aria-hidden />
        Not saved
      </button>
    ) : (
      <span className="hidden items-center gap-1 text-[11.5px] text-muted lg:inline-flex" title={`Saved in ${project.path}`} data-testid="save-status" aria-live="polite">
        {save.kind === "saving" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5 text-success" aria-hidden />}
        {save.kind === "saving" ? "Saving" : "Saved"}
      </span>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {warnings.length ? (
        <div role="status" className="flex shrink-0 items-start gap-2 border-b border-border bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface))] px-4 py-2 text-[12.5px]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 flex-1">
            Some of this circuit couldn&apos;t be opened, so it was left out: {warnings.slice(0, 3).join(" ")}
            {warnings.length > 3 ? ` And ${warnings.length - 3} more.` : ""}
          </p>
          <button type="button" onClick={() => setWarnings([])} aria-label="Dismiss" className="flex size-6 items-center justify-center rounded-[6px] text-muted hover:bg-muted-bg">
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <LabWorkspace
          ref={ref}
          host={HOST}
          titleMenu={titleMenu}
          titleMenuLabel="Project menu"
          saveStatus={saveStatus}
          generator="Kiungo desktop"
          onOpenBuild={onOpenBuild}
          projectChip={<span className="hidden text-[11.5px] text-muted xl:inline">{boardName(project.meta.board)}</span>}
          leading={
            <button type="button" onClick={onHome} title={`Home (${shortcut("H", { shift: true })})`} aria-label="Home" className="flex size-9 items-center justify-center rounded-[10px] text-muted hover:bg-muted-bg hover:text-foreground" data-testid="go-home">
              <House className="size-4" />
            </button>
          }
        />
      </div>
    </div>
  );
});
