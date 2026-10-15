"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Cable } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { HybridPhysicalPin } from "@/lib/hybrid-types";
import { cn } from "@/lib/utils";

type Props = {
  deviceId: string | null;
  selectedPinId: string | null;
  onSelectPin: (pinId: string) => void;
};

export function PinExplorer({ deviceId, selectedPinId, onSelectPin }: Props) {
  const [loaded, setPins] = useState<HybridPhysicalPin[]>([]);
  // With no device chosen there are no pins to show, whatever was loaded before.
  const pins = deviceId ? loaded : [];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) return;
    api
      .getHybridPhysicalPins(deviceId)
      .then((r) => {
        setPins(r.pins);
        setError(null);
      })
      .catch((err) => {
        setPins([]);
        setError(describeError(err, "The pins couldn't be loaded"));
      });
  }, [deviceId]);

  if (!deviceId) {
    return (
      <div className="rounded-[12px] border border-dashed border-border bg-canvas p-6 text-center text-sm text-muted">
        Select a physical device to explore its pins.
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <Cable className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Pin Explorer</h3>
        <Badge variant="info" className="ml-auto text-[10px]">
          {pins.length} pins
        </Badge>
      </div>
      {error ? <ErrorNotice message={error} size="sm" className="mt-2" /> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {pins.map((pin) => (
          <button
            key={pin.pin_id}
            type="button"
            onClick={() => onSelectPin(pin.pin_id)}
            className={cn(
              "rounded-[10px] border px-3 py-2 text-left text-xs transition-colors",
              selectedPinId === pin.pin_id
                ? "border-primary bg-accent"
                : "border-border bg-canvas hover:bg-muted-bg",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-semibold">{pin.pin_id}</span>
              <Badge variant={pin.state ? "success" : "default"}>{pin.state ? "HIGH" : "LOW"}</Badge>
            </div>
            <p className="mt-0.5 text-muted">{pin.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {pin.interfaces.map((iface) => (
                <Badge key={iface} variant="info" className="text-[9px]">
                  {iface}
                </Badge>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
