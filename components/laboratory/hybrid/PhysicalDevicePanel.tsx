"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, Plug, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { HybridPhysicalDevice } from "@/lib/hybrid-types";
import type { DiscoveredHardwareDevice } from "@/stores/discovery-store";

type Props = {
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
  onConnected: (device: HybridPhysicalDevice) => void;
};

export function PhysicalDevicePanel({ selectedDeviceId, onSelect, onConnected }: Props) {
  const [devices, setDevices] = useState<HybridPhysicalDevice[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredHardwareDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [hybrid, disc] = await Promise.all([
        api.listHybridPhysicalDevices(),
        api.listDiscoveredDevices(),
      ]);
      setDevices(hybrid.devices);
      setDiscovered(disc.devices.filter((d) => d.status === "connected"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function connectDiscovered(d: DiscoveredHardwareDevice) {
    setConnecting(d.port);
    setError(null);
    try {
      const device = await api.connectHybridPhysicalDevice({
        port: d.port,
        board_type: d.board_type,
        device_id: d.device_id ?? "",
        label: d.label,
      });
      onConnected(device);
      onSelect(device.device_id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Physical Devices</h3>
        <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={refresh} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Connected in Kiungo</p>
        {devices.length === 0 ? (
          <p className="text-xs text-muted">No physical devices connected yet.</p>
        ) : (
          devices.map((d) => (
            <button
              key={d.device_id}
              type="button"
              onClick={() => onSelect(d.device_id)}
              className={`w-full rounded-[10px] border px-3 py-2.5 text-left text-xs transition-colors ${
                selectedDeviceId === d.device_id
                  ? "border-primary bg-accent"
                  : "border-border bg-canvas hover:bg-muted-bg"
              }`}
            >
              <div className="flex items-start gap-2">
                <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{d.label || d.model || d.board_type}</p>
                    <Badge variant={d.connected ? "success" : "default"}>
                      {d.connected ? "live" : "off"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted">
                    <span className="font-medium text-foreground/80">Type:</span> {d.board_type}
                    {d.category ? ` · ${d.category}` : ""}
                  </p>
                  <p className="text-[10px] text-muted">
                    <span className="font-medium text-foreground/80">Manufacturer:</span>{" "}
                    {d.manufacturer || d.vendor || "Unknown"}
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    {d.port || d.endpoint}
                    {" · "}
                    {d.communication_method || d.transport || "serial"}
                  </p>
                  {d.capabilities?.length ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {d.capabilities.slice(0, 6).map((cap) => (
                        <Badge key={cap} variant="info" className="text-[9px]">
                          {cap}
                        </Badge>
                      ))}
                      {d.capabilities.length > 6 ? (
                        <Badge variant="default" className="text-[9px]">
                          +{d.capabilities.length - 6}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="text-[10px] text-muted">{d.pins?.length ?? 0} pins</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">USB Discovery</p>
        {discovered.length === 0 ? (
          <p className="text-xs text-muted">
            Plug in ESP32, Arduino, Pico, STM32, or connect a Raspberry Pi agent.
          </p>
        ) : (
          discovered.map((d) => (
            <div
              key={d.port}
              className="flex items-center gap-2 rounded-[10px] border border-border bg-canvas px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.label}</p>
                <p className="font-mono text-[10px] text-muted">
                  {d.port} · {d.board_type}
                  {d.manufacturer ? ` · ${d.manufacturer}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={connecting === d.port}
                onClick={() => connectDiscovered(d)}
              >
                Connect
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
