"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from "lucide-react";
import { api, getWorkspaceWsUrl } from "@/lib/api-client";
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
type LeftTab = "components" | "hardware";

export function EngineeringWorkspaceShell() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("properties");
  const [leftTab, setLeftTab] = useState<LeftTab>("components");
  const [inspectV2, setInspectV2] = useState<ComponentV2SearchHit | null>(null);
  const [selectedHardware, setSelectedHardware] = useState<WorkspaceHardwareNode | null>(null);
  const [hardwareInspector, setHardwareInspector] = useState<Record<string, unknown> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<WorkspaceConnection | null>(null);
  const [tracePath, setTracePath] = useState<string[]>([]);
  const upsertNode = useWorkspaceStore((s) => s.upsertNode);
  const workspaceNodes = useWorkspaceStore((s) => s.nodes);
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
    try {
      ws = new WebSocket(getWorkspaceWsUrl(workspaceId));
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type?: string; payload?: unknown };
          if (msg.type === "workspace_state" && msg.payload) {
            applyWorkspaceSnapshot(msg.payload);
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      const interval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 5000);
      return () => {
        clearInterval(interval);
        ws?.close();
      };
    } catch {
      return;
    }
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
          <Button
            size="sm"
            variant={leftOpen && leftTab === "components" ? "secondary" : "ghost"}
            onClick={() => {
              if (leftOpen && leftTab === "components") {
                setLeftOpen(false);
              } else {
                setLeftTab("components");
                setLeftOpen(true);
              }
            }}
            aria-expanded={leftOpen && leftTab === "components"}
          >
            <Plus className="h-3.5 w-3.5" /> Components
          </Button>
          <Button
            size="sm"
            variant={rightOpen ? "secondary" : "ghost"}
            onClick={() => setRightOpen(!rightOpen)}
            aria-expanded={rightOpen}
          >
            {rightOpen ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
            Details
          </Button>
        </div>
      </header>

      <SimulationToolbar workspaceId={workspaceId} />

      <div className="flex min-h-0 flex-1">
        {leftOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            className="flex w-[min(300px,80vw)] shrink-0 flex-col overflow-hidden border-r border-border bg-surface"
          >
            <div className="grid shrink-0 grid-cols-2 border-b border-border p-1.5">
              <button
                type="button"
                onClick={() => setLeftTab("components")}
                className={cn("rounded-md px-3 py-2 text-xs font-medium", leftTab === "components" ? "bg-accent text-primary" : "text-muted hover:bg-muted-bg")}
              >
                Components
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("hardware")}
                className={cn("rounded-md px-3 py-2 text-xs font-medium", leftTab === "hardware" ? "bg-accent text-primary" : "text-muted hover:bg-muted-bg")}
              >
                Hardware
              </button>
            </div>
            {leftTab === "components" ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <ComponentBrowser
                  onInspect={(item) => {
                    setInspectV2(item);
                    setRightTab("datasheet");
                    setRightOpen(true);
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
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <HardwareExplorer
                    selectedId={selectedHardware?.device_id}
                    onSelect={async (node) => {
                      setSelectedHardware(node);
                      setRightTab("hardware");
                      setRightOpen(true);
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
                <HardwareDiscoveryPanel workspaceId={workspaceId} onWorkspaceRecover={recoverWorkspace} />
              </div>
            )}
          </motion.aside>
        ) : null}

        <main className="relative min-h-0 min-w-0 flex-1">
          {workspaceNodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="pointer-events-auto flex max-w-sm flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-[var(--shadow-sm)]">
                  <Cpu className="h-5 w-5" />
                </div>
                <h1 className="text-lg font-semibold text-foreground">Start with a component</h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Add a board or sensor to begin building your circuit.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setLeftTab("components");
                    setLeftOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Browse components
                </Button>
              </div>
            </div>
          ) : null}
          <SignalTraceOverlay path={tracePath} visible={tracePath.length > 0} />
          <WorkspaceCanvas workspaceId={workspaceId} />
        </main>

        {rightOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            className="flex w-[min(320px,85vw)] shrink-0 flex-col overflow-hidden border-l border-border bg-surface"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <h2 className="text-xs font-semibold text-foreground">Details</h2>
              <select
                aria-label="Details section"
                value={rightTab}
                onChange={(event) => setRightTab(event.target.value as RightTab)}
                className="h-8 max-w-[180px] rounded border border-border bg-canvas px-2 text-xs"
              >
                <option value="properties">Properties</option>
                <option value="datasheet">Datasheet</option>
                <option value="hardware">Board</option>
                <option value="livewire">Wiring</option>
                <option value="devices">Devices</option>
                <option value="wires">Wires</option>
                <option value="metrics">Metrics</option>
              </select>
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
