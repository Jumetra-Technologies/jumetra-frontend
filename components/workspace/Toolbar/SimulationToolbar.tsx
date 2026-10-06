"use client";

import {
  Cable,
  Gauge,
  Grid3X3,
  LayoutGrid,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  SkipForward,
  Undo2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulationStore } from "@/stores/simulation-store";
import { useUIStore } from "@/stores/ui-store";
import { applyWorkspaceSnapshot } from "@/lib/workspace-snapshot";
import { cn } from "@/lib/utils";

const SPEEDS = ["1x", "2x", "5x", "10x", "100x"] as const;

export function SimulationToolbar({ workspaceId }: { workspaceId: string }) {
  const status = useSimulationStore((s) => s.status);
  const speed = useSimulationStore((s) => s.speed);
  const simTimeMs = useSimulationStore((s) => s.simTimeMs);
  const fps = useSimulationStore((s) => s.fps);
  const eventsPerSec = useSimulationStore((s) => s.eventsPerSec);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const wireToolActive = useUIStore((s) => s.wireToolActive);
  const setWireToolActive = useUIStore((s) => s.setWireToolActive);
  const snapGrid = useUIStore((s) => s.snapGrid);
  const setSnapGrid = useUIStore((s) => s.setSnapGrid);
  const breadboardMode = useUIStore((s) => s.breadboardMode);
  const setBreadboardMode = useUIStore((s) => s.setBreadboardMode);

  async function sync(state: unknown) {
    applyWorkspaceSnapshot(state);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 shadow-[var(--shadow-sm)]">
      <Button
        size="sm"
        onClick={async () => sync(await api.runEngineeringWorkspace(workspaceId, speed))}
      >
        <Play className="h-3.5 w-3.5" />
        Run
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => sync(await api.pauseEngineeringWorkspace(workspaceId))}
      >
        <Pause className="h-3.5 w-3.5" />
        Pause
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => sync(await api.stepEngineeringWorkspace(workspaceId, 100))}
      >
        <SkipForward className="h-3.5 w-3.5" />
        Step
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => sync(await api.resetEngineeringWorkspace(workspaceId))}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>

      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

      <div className="flex items-center gap-1 rounded-[10px] border border-border bg-canvas p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={cn(
              "rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors",
              speed === s ? "bg-surface text-primary shadow-[var(--shadow-sm)]" : "text-muted hover:text-foreground",
            )}
          >
            {s === "1x" ? "Realtime" : s}
          </button>
        ))}
      </div>

      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

      <Button
        size="sm"
        variant={wireToolActive ? "default" : "secondary"}
        onClick={() => setWireToolActive(!wireToolActive)}
      >
        <Cable className="h-3.5 w-3.5" />
        Wire Tool
      </Button>
      <Button
        size="sm"
        variant={snapGrid ? "default" : "secondary"}
        onClick={() => setSnapGrid(!snapGrid)}
      >
        <Grid3X3 className="h-3.5 w-3.5" />
        Snap
      </Button>
      <Button
        size="sm"
        variant={breadboardMode ? "default" : "secondary"}
        onClick={() => setBreadboardMode(!breadboardMode)}
        aria-label="Breadboard mode"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Breadboard
      </Button>
      <Button size="sm" variant="ghost" onClick={async () => sync(await api.undoWorkspace(workspaceId))}>
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </Button>
      <Button size="sm" variant="ghost" onClick={async () => sync(await api.redoWorkspace(workspaceId))}>
        <Redo2 className="h-3.5 w-3.5" />
        Redo
      </Button>

      <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
        <Badge variant={status === "running" ? "success" : "info"}>{status}</Badge>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3" /> t={simTimeMs}ms
        </span>
        <span>FPS {fps}</span>
        <span>Evt/s {eventsPerSec}</span>
      </div>
    </div>
  );
}
