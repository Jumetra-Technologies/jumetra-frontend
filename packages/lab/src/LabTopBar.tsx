"use client";

import type { ReactNode, Ref } from "react";
import { MoreHorizontal, OctagonX, Pause, Play, Plus } from "lucide-react";
import { Menu, type MenuEntry } from "@kiungo/ui/menu";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import type { LabView } from "@kiungo/core/lab/types";

export interface RunButtonState {
  running: boolean;
  /** Plugging in, building or loading: Run is busy. */
  busy: boolean;
  label: string;
  title: string;
  onClick: () => void;
}

/**
 * The lab's top bar, left to right (B1): + Add · the session's name and its
 * menu · Run/Stop · simulated time · ⋮ · the view switch · what the host puts
 * at the end (the desktop's Code button) · save status. Emergency stop sits
 * beside Run while a real board is live. Everything else (step, reset, speed,
 * sound, undo, redo, fit, files) is in ⋮.
 */
export function LabTopBar({
  leading,
  addRef,
  onAdd,
  title,
  projectChip,
  emergencyStop,
  run,
  t,
  more,
  view,
  views,
  onView,
  trailing,
  saveStatus,
}: {
  leading?: ReactNode;
  addRef?: Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** The session's name, or its rename field. */
  title: ReactNode;
  projectChip?: ReactNode;
  /** Shown while a real board is running: everything off at once. */
  emergencyStop?: () => void;
  run: RunButtonState;
  t: number;
  more: MenuEntry[];
  view: LabView;
  views: Array<{ id: LabView; label: string; icon: ReactNode; description?: string; info?: string }>;
  onView: (view: LabView) => void;
  trailing?: ReactNode;
  saveStatus?: ReactNode;
}) {
  return (
    <header className="relative z-20 flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 py-2 sm:px-3" data-testid="lab-top-bar">
      {leading}
      <button ref={addRef} type="button" onClick={onAdd} className="k-lab-add" aria-keyshortcuts="/" title="Add a part (/)" data-testid="add-part">
        <Plus className="size-4" aria-hidden strokeWidth={2.4} />
        Add
      </button>
      <div className="flex min-w-0 items-center gap-1">
        {title}
        {projectChip}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {emergencyStop ? (
          <button type="button" onClick={emergencyStop} title="Emergency stop: every output on the real board off at once (Esc)" className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#c81e1e] px-3 text-[12.5px] font-semibold text-white shadow-[0_0_0_3px_color-mix(in_srgb,#c81e1e_25%,transparent)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" data-testid="emergency-stop">
            <OctagonX className="size-4" aria-hidden />
            Emergency stop
          </button>
        ) : null}
        <button type="button" onClick={run.onClick} className="k-lab-run" data-running={run.running} aria-busy={run.busy || undefined} title={run.title} data-testid="run-toggle">
          {run.running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden fill="currentColor" />}
          {run.label}
        </button>
        <span className="hidden w-14 text-right font-mono text-xs tabular-nums text-muted sm:inline" data-testid="sim-time" aria-label={`Simulated time ${t.toFixed(1)} seconds`}>
          {t.toFixed(1)} s
        </span>
        <Menu label="More lab actions" align="end" buttonClassName="flex size-10 items-center justify-center rounded-[10px] text-muted hover:bg-muted-bg hover:text-foreground" items={more}>
          <MoreHorizontal className="size-5" />
        </Menu>
        <SegmentedControl value={view} onChange={onView} options={views} label="Canvas view" size="sm" iconOnly className="hidden md:inline-flex" />
        {trailing}
        {saveStatus}
      </div>
    </header>
  );
}
