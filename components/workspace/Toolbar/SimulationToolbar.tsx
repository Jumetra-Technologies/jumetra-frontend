"use client";

import {
  Cable,
  ChevronDown,
  Gauge,
  Grid3X3,
  LayoutGrid,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulationStore } from "@/stores/simulation-store";
import { useUIStore } from "@/stores/ui-store";
import { applyWorkspaceSnapshot } from "@/lib/workspace-snapshot";

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
  const isRunning = status === "running";

  async function sync(state: unknown) {
    applyWorkspaceSnapshot(state);
  }

  return (
    <div className="relative z-20 flex min-h-12 items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
      <Button
        size="sm"
        variant={isRunning ? "secondary" : "default"}
        onClick={async () =>
          sync(
            await (isRunning
              ? api.pauseEngineeringWorkspace(workspaceId)
              : api.runEngineeringWorkspace(workspaceId, speed)),
          )
        }
      >
        {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {isRunning ? "Pause" : "Run"}
      </Button>

      <Badge variant={isRunning ? "success" : "info"}>{status}</Badge>

      <details className="relative ml-auto">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted-bg">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Tools
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </summary>
        <div className="absolute right-0 top-10 z-30 w-[min(19rem,calc(100vw-1.5rem))] space-y-3 rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-md)]">
          <label className="flex items-center justify-between gap-3 text-xs font-medium">
            Simulation speed
            <select
              aria-label="Simulation speed"
              value={speed}
              onChange={(event) => setSpeed(event.target.value)}
              className="h-8 rounded border border-border bg-canvas px-2 text-xs"
            >
              {SPEEDS.map((option) => (
                <option key={option} value={option}>
                  {option === "1x" ? "Realtime" : option}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => sync(await api.stepEngineeringWorkspace(workspaceId, 100))}
            >
              <SkipForward className="h-3.5 w-3.5" /> Step
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => sync(await api.resetEngineeringWorkspace(workspaceId))}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              size="sm"
              variant={wireToolActive ? "default" : "secondary"}
              onClick={() => setWireToolActive(!wireToolActive)}
            >
              <Cable className="h-3.5 w-3.5" /> Wire Tool
            </Button>
            <Button
              size="sm"
              variant={snapGrid ? "default" : "secondary"}
              onClick={() => setSnapGrid(!snapGrid)}
            >
              <Grid3X3 className="h-3.5 w-3.5" /> Snap
            </Button>
            <Button
              size="sm"
              variant={breadboardMode ? "default" : "secondary"}
              onClick={() => setBreadboardMode(!breadboardMode)}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Breadboard
            </Button>
            <Button size="sm" variant="secondary" onClick={async () => sync(await api.undoWorkspace(workspaceId))}>
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
            <Button size="sm" variant="secondary" onClick={async () => sync(await api.redoWorkspace(workspaceId))}>
              <Redo2 className="h-3.5 w-3.5" /> Redo
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[10px] text-muted">
            <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" /> {simTimeMs} ms</span>
            <span>FPS {fps}</span>
            <span>Events/s {eventsPerSec}</span>
          </div>
        </div>
      </details>
    </div>
  );
}
