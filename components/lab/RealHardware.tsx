"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Plug, Usb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { getPart } from "@/lib/parts";
import { useLab } from "@/lib/lab/store";
import type { DiscoveredHardwareDevice } from "@/stores/discovery-store";
import { useLabContext } from "./lab-context";

/** Board types the discovery service reports, mapped to catalogue parts. */
const BOARD_PART: Record<string, string> = {
  "arduino-uno": "arduino-uno",
  "arduino-mega": "arduino-mega",
  esp32: "esp32",
  esp8266: "esp8266",
  stm32: "stm32",
  "raspberry-pi-pico": "raspberry-pi-pico",
};

/**
 * Real boards on USB, through the Kiungo runtime: scan, then put a board on the
 * canvas as a physical part. Its wiring is checked like any other; the
 * runtime binds it to the port.
 */
export function RealHardware() {
  const { runtime, addPart } = useLabContext();
  const [devices, setDevices] = useState<DiscoveredHardwareDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (runtime !== "online" && runtime !== "syncing") {
    return (
      <p className="text-[12.5px] leading-5 text-muted">
        Real boards on USB join the canvas through the Kiungo runtime, which isn&apos;t running. Everything else works offline.{" "}
        <Link href="/docs/technical-guides/run-locally" className="font-medium text-primary hover:underline">
          Run it locally
        </Link>
      </p>
    );
  }

  const scan = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.scanDiscovery();
      setDevices(result.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5" data-testid="real-hardware">
      <Button size="sm" variant="secondary" onClick={scan} disabled={busy}>
        {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Usb className="size-3.5" aria-hidden />} Scan USB ports
      </Button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      {devices && !devices.length ? <p className="text-[12.5px] text-muted">No boards found. Plug one in and scan again.</p> : null}
      {devices?.map((device) => {
        const partId = BOARD_PART[device.board_type];
        return (
          <div key={device.port} className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2">
            <Plug className="size-4 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{device.label || getPart(partId ?? "")?.name || device.board_type}</p>
              <p className="truncate font-mono text-[11px] text-muted">{device.port}</p>
            </div>
            {partId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const node = addPart(partId);
                  if (node) {
                    useLab.getState().setNodeMode(node.id, "physical");
                    useLab.getState().renameNode(node.id, `${node.label} (${device.port.split("/").pop()})`);
                  }
                }}
              >
                Add
              </Button>
            ) : (
              <span className="text-[11px] text-muted">Unsupported</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
