"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, Plug, Plus, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, getDiscoveryWsUrl } from "@/lib/api-client";
import { openAuthenticatedWebSocket } from "@/lib/ws-client";
import {
  statusBadgeVariant,
  useDiscoveryStore,
  type DiscoveredHardwareDevice,
} from "@/stores/discovery-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  applyWorkspaceSnapshot,
  isNotFoundError,
} from "@/lib/workspace-snapshot";
import { cn } from "@/lib/utils";

const BOARD_COMPONENT_MAP: Record<string, string> = {
  "arduino-uno": "arduino-uno",
  "arduino-mega": "arduino-mega",
  "arduino-nano": "arduino-nano",
  esp32: "esp32",
  esp8266: "esp8266",
  stm32: "stm32",
  "raspberry-pi-pico": "raspberry-pi-pico",
};

function DeviceRow({
  device,
  onAddToCanvas,
  adding,
}: {
  device: DiscoveredHardwareDevice;
  onAddToCanvas: (device: DiscoveredHardwareDevice) => Promise<void>;
  adding: boolean;
}) {
  const isUnknown = !device.hhip_firmware || device.board_type === "unknown-serial";
  const canAdd = BOARD_COMPONENT_MAP[device.board_type] != null;

  async function installFirmware() {
    await api.uploadDiscoveryFirmware(device.port);
    await api.scanDiscovery();
  }

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-2.5 text-xs shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{device.label}</p>
          <p className="font-mono text-[10px] text-muted">{device.port}</p>
        </div>
        <Badge variant={statusBadgeVariant(device.status)}>{device.status}</Badge>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        {device.manufacturer ? (
          <>
            <dt className="text-muted">Mfr</dt>
            <dd className="truncate">{device.manufacturer}</dd>
          </>
        ) : null}
        {device.serial_number ? (
          <>
            <dt className="text-muted">Serial</dt>
            <dd className="truncate font-mono">{device.serial_number}</dd>
          </>
        ) : null}
        {device.vid != null && device.pid != null ? (
          <>
            <dt className="text-muted">VID:PID</dt>
            <dd className="font-mono">
              {device.vid?.toString(16).toUpperCase()}:{device.pid?.toString(16).toUpperCase()}
            </dd>
          </>
        ) : null}
        {device.firmware_version ? (
          <>
            <dt className="text-muted">Firmware</dt>
            <dd className="font-mono">{device.firmware_version}</dd>
          </>
        ) : null}
        {device.device_id ? (
          <>
            <dt className="text-muted">Device ID</dt>
            <dd className="truncate font-mono">{device.device_id}</dd>
          </>
        ) : null}
      </dl>
      {device.capabilities?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {device.capabilities.map((c) => (
            <Badge key={c} variant="info" className="text-[9px]">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}
      {canAdd && device.status === "connected" ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 h-7 w-full"
          disabled={adding}
          onClick={() => onAddToCanvas(device)}
        >
          <Plus className="h-3 w-3" />
          Add physical board to canvas
        </Button>
      ) : null}
      {isUnknown && device.status === "connected" ? (
        <div className="mt-2 rounded-[8px] border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
          <p className="font-medium">Unknown Serial Device</p>
          <p className="mt-0.5">{device.error || "HHIP firmware not detected"}</p>
          <Button size="sm" variant="secondary" className="mt-2 h-7 w-full" onClick={installFirmware}>
            <Upload className="h-3 w-3" />
            Install HHIP Firmware
          </Button>
        </div>
      ) : null}
      {device.error && !isUnknown ? (
        <p className="mt-2 text-[10px] text-danger">{device.error}</p>
      ) : null}
    </div>
  );
}

export function HardwareDiscoveryPanel({
  workspaceId,
  onWorkspaceRecover,
}: {
  workspaceId: string;
  onWorkspaceRecover?: () => Promise<string | null>;
}) {
  const devices = useDiscoveryStore((s) => s.devices);
  const wsConnected = useDiscoveryStore((s) => s.connected);
  const setDevices = useDiscoveryStore((s) => s.setDevices);
  const setConnected = useDiscoveryStore((s) => s.setConnected);
  const upsertNode = useWorkspaceStore((s) => s.upsertNode);
  const [apiError, setApiError] = useState<string | null>(null);
  const [addingPort, setAddingPort] = useState<string | null>(null);

  const handleRescan = useCallback(async () => {
    setApiError(null);
    try {
      const r = await api.scanDiscovery();
      setDevices(r.devices);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Discovery scan failed");
    }
  }, [setDevices]);

  const addPhysicalToCanvas = useCallback(
    async (device: DiscoveredHardwareDevice) => {
      const componentId = BOARD_COMPONENT_MAP[device.board_type];
      if (!componentId) return;

      setAddingPort(device.port);
      setApiError(null);

      async function place(activeWorkspaceId: string) {
        const node = await api.addWorkspaceNode(activeWorkspaceId, {
          component_id: componentId,
          label: device.label,
          position: { x: 80 + Math.random() * 120, y: 80 + Math.random() * 120 },
          device_mode: "physical",
          physical_port: device.port,
          physical_device_id: device.device_id ?? device.port,
          available: true,
        });
        upsertNode(node);
        applyWorkspaceSnapshot(await api.getEngineeringWorkspaceState(activeWorkspaceId));
      }

      try {
        await place(workspaceId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add device";
        if (isNotFoundError(err) && onWorkspaceRecover) {
          const newId = await onWorkspaceRecover();
          if (newId) {
            await place(newId);
            return;
          }
        }
        setApiError(message);
      } finally {
        setAddingPort(null);
      }
    },
    [workspaceId, onWorkspaceRecover, upsertNode],
  );

  useEffect(() => {
    api
      .listDiscoveredDevices()
      .then((r) => {
        setDevices(r.devices);
        setApiError(null);
      })
      .catch((err) => {
        setApiError(err instanceof Error ? err.message : "Cannot load discovered devices");
      });

    let ws: WebSocket | null = null;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    void openAuthenticatedWebSocket(getDiscoveryWsUrl())
      .then((socket) => {
        if (cancelled) {
          socket.close();
          return;
        }
        ws = socket;
        socket.onopen = () => setConnected(true);
        socket.onclose = () => setConnected(false);
        socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "discovery_update" && Array.isArray(msg.devices)) {
            setDevices(msg.devices);
          }
        } catch {
          /* ignore */
        }
        };
        interval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
        }, 10000);
      })
      .catch(() => setConnected(false));
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      ws?.close();
    };
  }, [setDevices, setConnected]);

  const active = devices.filter((d) => d.status !== "disconnected");

  return (
    <div className="border-t border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2">
        <Plug className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Hardware Discovery</span>
        <Badge variant={wsConnected ? "success" : "default"} className="ml-1 text-[9px]">
          {wsConnected ? "live" : "offline"}
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-7 w-7"
          aria-label="Rescan USB devices"
          onClick={handleRescan}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {apiError ? <p className="px-3 pb-2 text-[10px] text-danger">{apiError}</p> : null}
      <div className={cn("max-h-48 space-y-2 overflow-y-auto px-3 pb-3", active.length === 0 && "pb-4")}>
        {active.length === 0 ? (
          <p className="flex items-center gap-2 text-[11px] text-muted">
            <Cpu className="h-3.5 w-3.5" />
            Scanning USB serial every 2s…
          </p>
        ) : (
          active.map((d) => (
            <DeviceRow
              key={d.port}
              device={d}
              adding={addingPort === d.port}
              onAddToCanvas={addPhysicalToCanvas}
            />
          ))
        )}
      </div>
    </div>
  );
}
