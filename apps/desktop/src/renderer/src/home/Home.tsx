import type { ReactNode } from "react";
import { FolderOpen, MoreHorizontal, Plus, Search } from "lucide-react";
import type { RecentProject } from "@kiungo/api";
import { STARTERS } from "@kiungo/core/project";
import { Button } from "@kiungo/ui/button";
import { KiungoLogo } from "@kiungo/ui/KiungoMark";
import { Menu } from "@kiungo/ui/menu";
import { openedAgo, shortcut } from "../ipc";
import { CircuitThumbnail } from "./CircuitThumbnail";

/** Starters offered on an empty Home, so the first project is one click away. */
const FIRST_STARTERS = ["blink", "distance", "servo", "motion-alarm"];

interface HomeProps {
  /** Null while the list loads. */
  recent: RecentProject[] | null;
  /** The message from the last open that failed, shown until the next action. */
  error: string | null;
  onNew: (starter?: string | null) => void;
  onOpenFolder: () => void;
  onOpen: (project: RecentProject) => void;
  onReveal: (project: RecentProject) => void;
  onForget: (project: RecentProject) => void;
  onPalette: () => void;
  /** Who's signed in, at the end of the top bar. */
  account?: ReactNode;
}

/** Home is the user's projects and nothing else (DSK-10). */
export function Home({ recent, error, onNew, onOpenFolder, onOpen, onReveal, onForget, onPalette, account }: HomeProps) {
  const empty = recent !== null && recent.length === 0;
  return (
    <div className="flex h-full flex-col bg-background text-foreground" data-testid="home">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
        <KiungoLogo className="h-6" />
        <span className="flex-1" />
        <button type="button" onClick={onPalette} className="hidden h-9 items-center gap-2 rounded-[10px] border border-border px-3 text-[13px] text-muted hover:border-primary/40 hover:text-foreground sm:flex" aria-label="Search and commands">
          <Search className="size-3.5" aria-hidden />
          Search and commands
          <kbd className="ml-3 font-sans text-[12px] text-muted">{shortcut("K")}</kbd>
        </button>
        <Button variant="secondary" onClick={onOpenFolder} title={`Open a project folder (${shortcut("O")})`}>
          <FolderOpen className="size-4" aria-hidden />
          Open folder
        </Button>
        <Button onClick={() => onNew()} title={`New project (${shortcut("N")})`} data-testid="new-project">
          <Plus className="size-4" aria-hidden />
          New project
        </Button>
        {account}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1120px] px-8 pb-12 pt-8">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Projects</h1>

          {error ? (
            <p role="alert" className="mt-4 rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-[13.5px] text-danger">
              {error}
            </p>
          ) : null}

          {recent === null ? null : empty ? (
            <section className="mt-6 max-w-[640px]" aria-label="Start your first project">
              <p className="text-[15px] leading-7 text-muted">Projects you make or open show up here. Start with a ready-made circuit and its code, or a board on its own.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {FIRST_STARTERS.map((id) => {
                  const starter = STARTERS.find((s) => s.id === id)!;
                  return (
                    <button key={id} type="button" onClick={() => onNew(id)} className="flex flex-col items-start justify-start rounded-[14px] border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary" data-testid={`first-${id}`}>
                      <span className="block text-[14px] font-semibold">{starter.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-5 text-muted">{starter.does}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => onNew(null)} className="mt-3 text-[13.5px] font-medium text-primary hover:underline">
                Start with a blank project
              </button>
            </section>
          ) : (
            <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-4" aria-label="Recent projects">
              {recent.map((p) => (
                <ProjectCard key={p.path} project={p} onOpen={() => onOpen(p)} onReveal={() => onReveal(p)} onForget={() => onForget(p)} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project, onOpen, onReveal, onForget }: { project: RecentProject; onOpen: () => void; onReveal: () => void; onForget: () => void }) {
  const folder = project.path.split(/[\\/]/).filter(Boolean).pop() ?? project.path;
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        disabled={project.missing}
        className="flex w-full flex-col overflow-hidden rounded-[16px] border border-border bg-surface text-left transition-colors hover:border-primary/60 disabled:cursor-default disabled:hover:border-border"
        title={project.path}
        data-testid="project-card"
      >
        <CircuitThumbnail thumbnail={project.thumbnail} className="aspect-[16/10] w-full border-b border-border" />
        <span className="block px-4 pb-3.5 pt-3">
          <span className="block truncate pr-7 text-[14.5px] font-semibold">{project.missing ? folder : project.name}</span>
          {project.missing ? (
            <span className="mt-0.5 block text-[12.5px] text-danger">Moved or deleted</span>
          ) : (
            <>
              <span className="mt-0.5 block truncate text-[12.5px] text-muted">{project.boardName}</span>
              <span className="block text-[12.5px] text-muted">Opened {openedAgo(project.openedAt)}</span>
            </>
          )}
        </span>
      </button>
      <div className="absolute bottom-3 right-2.5">
        <Menu
          label={`More for ${project.name ?? folder}`}
          align="end"
          buttonClassName="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground"
          items={[
            ...(!project.missing ? [{ id: "reveal", label: "Show in folder", onSelect: onReveal }] : []),
            { id: "forget", label: "Remove from this list", hint: "The folder stays", onSelect: onForget },
          ]}
        >
          <MoreHorizontal className="size-4" />
        </Menu>
      </div>
    </li>
  );
}
