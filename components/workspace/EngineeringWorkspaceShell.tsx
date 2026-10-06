"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { api, getWorkspaceWsUrl } from "@/lib/api-client";
import { openAuthenticatedWebSocket } from "@/lib/ws-client";
import { WorkspaceCanvas } from "@/components/workspace/Canvas/WorkspaceCanvas";
import { ComponentBrowser } from "@/components/library/ComponentBrowser";
import { ComponentInspector } from "@/components/library/ComponentInspector";
import type { ComponentV2SearchHit } from "@/lib/types";
import { HardwareDiscoveryPanel } from "@/components/workspace/Hardware/HardwareDiscoveryPanel";
import { HardwareExplorer } from "@/components/workspace/HardwareExplorer";
import { BoardInspector } from "@/components/workspace/BoardInspector";
import { AutoDiscoveryToast } from "@/components/workspace/AutoDiscoveryToast";
import { PropertyInspector } from "@/components/workspace/Inspector/PropertyInspector";
import { SimulationToolbar } from "@/components/workspace/Toolbar/SimulationToolbar";
import { DeviceManagerPanel } from "@/components/workspace/Simulation/DeviceManagerPanel";
import { SimulationInspector } from "@/components/workspace/Simulation/SimulationInspector";
import { BottomDock } from "@/components/workspace/Panels/BottomDock";
import { WireEditor } from "@/components/workspace/Wire/WireEditor";
import { ConnectionManager } from "@/components/workspace/ConnectionManager";
import { ConnectionInspector } from "@/components/workspace/ConnectionInspector";
import { SignalTraceOverlay } from "@/components/workspace/SignalTraceOverlay";
import type { WorkspaceConnection } from "@/components/workspace/ConnectionManager";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUIStore } from "@/stores/ui-store";
import type { WorkspaceHardwareNode } from "@/components/workspace/hardware-types";
import {
  applyWorkspaceSnapshot,
  isNotFoundError,
  persistWorkspaceId,
  readPersistedWorkspaceId,
} from "@/lib/workspace-snapshot";
import { cn } from "@/lib/utils";

type RightTab = "properties" | "devices" | "wires" | "metrics" | "hardware" | "livewire" | "datasheet";

export function EngineeringWorkspaceShell() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("properties");
  const [inspectV2, setInspectV2] = useState<ComponentV2SearchHit | null>(null);
  const [selectedHardware, setSelectedHardware] = useState<WorkspaceHardwareNode | null>(null);
  const [hardwareInspector, setHardwareInspector] = useState<Record<string, unknown> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<WorkspaceConnection | null>(null);
  const [tracePath, setTracePath] = useState<string[]>([]);
  const upsertNode = useWorkspaceStore((s) => s.upsertNode);
  const leftOpen = useUIStore((s) => s.leftOpen);
  const rightOpen = useUIStore((s) => s.rightOpen);
  const setLeftOpen = useUIStore((s) => s.setLeftOpen);
  const setRightOpen = useUIStore((s) => s.setRightOpen);

  const adoptWorkspace = useCallback(async (id: string) => {
    const connected = await api.connectEngineeringWorkspace(id);
    applyWorkspaceSnapshot(connected);
    persistWorkspaceId(id);
    setWorkspaceId(id);
    return id;
  }, []);

  const createWorkspace = useCallback(async () => {
    const created = await api.createEngineeringWorkspace({ name: "Engineering Lab" });
    return adoptWorkspace(created.workspace_id);
  }, [adoptWorkspace]);

  const bootstrapWorkspace = useCallback(async () => {
    const existing = readPersistedWorkspaceId();
    if (existing) {
      try {
        return await adoptWorkspace(existing);
      } catch (err) {
        if (!isNotFoundError(err)) throw err;
      }
    }
    return createWorkspace();
  }, [adoptWorkspace, createWorkspace]);

  const recoverWorkspace = useCallback(async () => {
    setError("");
    return createWorkspace();
  }, [createWorkspace]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await bootstrapWorkspace();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to start workspace");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapWorkspace]);

  useEffect(() => {
    if (!workspaceId) return;
    let ws: WebSocket | null = null;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    void openAuthenticatedWebSocket(getWorkspaceWsUrl(workspaceId))
      .then((socket) => {
        if (cancelled) {
          socket.close();
          return;
        }
        ws = socket;
        socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type?: string; payload?: unknown };
          if (msg.type === "workspace_state" && msg.payload) {
            applyWorkspaceSnapshot(msg.payload);
          }
        } catch {
          /* ignore malformed frames */
        }
        };
        interval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 5000);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      ws?.close();
    };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted">
        Loading engineering workspace…
      </div>
    );
  }
  if (error || !workspaceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-background text-sm">
        <p className="text-danger">{error || "Workspace unavailable"}</p>
        <p className="text-muted">Ensure the API is running on port 8000.</p>
        <Button
          size="sm"
          onClick={() => {
            setLoading(true);
            void recoverWorkspace()
              .catch((err) => setError(err instanceof Error ? err.message : "Recover failed"))
              .finally(() => setLoading(false));
          }}
        >
          Create new workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-surface px-4 py-2.5 shadow-[var(--shadow-sm)]">
        <span className="text-sm font-semibold tracking-tight">Engineering Workspace</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-muted sm:inline">{workspaceId}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLeftOpen(!leftOpen)}
            aria-label="Toggle explorer"
          >
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRightOpen(!rightOpen)}
            aria-label="Toggle inspector"
          >
            {rightOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <SimulationToolbar workspaceId={workspaceId} />

      <div className="flex min-h-0 flex-1">
        {leftOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            className="flex w-[272px] shrink-0 flex-col overflow-hidden border-r border-border"
          >
            <div className="min-h-0 flex-[1.1] overflow-hidden border-b border-border">
              <HardwareExplorer
                selectedId={selectedHardware?.device_id}
                onSelect={async (node) => {
                  setSelectedHardware(node);
                  setRightTab("hardware");
                  try {
                    const detail = await api.getWorkspaceHardware(node.device_id);
                    setHardwareInspector((detail.inspector as Record<string, unknown>) || null);
                    setSelectedHardware({ ...node, ...(detail as WorkspaceHardwareNode) });
                  } catch {
                    setHardwareInspector(null);
                  }
                }}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ComponentBrowser
                onInspect={(item) => {
                  setInspectV2(item);
                  setRightTab("datasheet");
                }}
                onAddToWorkspace={async (item) => {
                  try {
                    const node = await api.addWorkspaceNode(workspaceId, {
                      component_id: item.id,
                      position: { x: 140 + Math.random() * 240, y: 100 + Math.random() * 180 },
                      device_mode: "virtual",
                    });
                    upsertNode(node);
                    await api.createComponentV2Binding({
                      component_id: item.id,
                      instance_id: node.id || item.id,
                      mode: "virtual",
                    });
                    applyWorkspaceSnapshot(await api.getEngineeringWorkspaceState(workspaceId));
                  } catch {
                    /* ignore add errors */
                  }
                }}
              />
            </div>
            <HardwareDiscoveryPanel workspaceId={workspaceId} onWorkspaceRecover={recoverWorkspace} />
          </motion.aside>
        ) : null}

        <main className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-[10px] border border-border bg-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted shadow-[var(--shadow-sm)] backdrop-blur">
            Infinite Canvas · React Flow
          </div>
          <SignalTraceOverlay path={tracePath} visible={tracePath.length > 0} />
          <WorkspaceCanvas workspaceId={workspaceId} />
        </main>

        {rightOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-surface"
          >
            <div className="flex gap-1 border-b border-border p-1.5 text-[11px]">
              {(
                [
                  ["properties", "Inspector"],
                  ["datasheet", "Datasheet"],
                  ["hardware", "Board"],
                  ["livewire", "Wiring"],
                  ["devices", "Devices"],
                  ["wires", "Wires"],
                  ["metrics", "Metrics"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRightTab(id)}
                  className={cn(
                    "rounded-[10px] px-2.5 py-1.5 font-medium transition-colors",
                    rightTab === id
                      ? "bg-accent text-primary"
                      : "text-muted hover:bg-muted-bg hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {rightTab === "properties" ? <PropertyInspector workspaceId={workspaceId} /> : null}
              {rightTab === "datasheet" ? (
                <ComponentInspector componentId={inspectV2?.id} fallback={inspectV2} />
              ) : null}
              {rightTab === "hardware" ? (
                <BoardInspector node={selectedHardware} inspector={hardwareInspector} />
              ) : null}
              {rightTab === "livewire" ? (
                <div className="flex h-full flex-col">
                  <div className="min-h-0 flex-1">
                    <ConnectionManager
                      workspaceId={workspaceId}
                      selectedId={selectedConnection?.connection_id}
                      onSelect={(c) => setSelectedConnection(c)}
                    />
                  </div>
                  <div className="max-h-[40%] border-t border-border">
                    <ConnectionInspector
                      connection={selectedConnection}
                      onHighlight={async (c) => {
                        try {
                          const res = await api.highlightWorkspacePath({
                            start_device: c.source_device,
                            start_pin: c.source_pin,
                            end_device: c.destination_device,
                            end_pin: c.destination_pin,
                          });
                          setTracePath(res.path || []);
                        } catch {
                          setTracePath([
                            `${c.source_device}:${c.source_pin}`,
                            `${c.destination_device}:${c.destination_pin}`,
                          ]);
                        }
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {rightTab === "devices" ? <DeviceManagerPanel workspaceId={workspaceId} /> : null}
              {rightTab === "wires" ? <WireEditor workspaceId={workspaceId} /> : null}
              {rightTab === "metrics" ? <SimulationInspector /> : null}
            </div>
          </motion.aside>
        ) : null}
      </div>

      <BottomDock workspaceId={workspaceId} />
      <AutoDiscoveryToast />
    </div>
  );
}
