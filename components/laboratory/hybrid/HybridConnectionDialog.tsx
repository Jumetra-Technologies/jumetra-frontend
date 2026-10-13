"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { HybridPinConnection } from "@/lib/hybrid-types";

type Props = {
  deviceId: string | null;
  physicalPinId: string | null;
  onCreated: (connection: HybridPinConnection) => void;
};

export function HybridConnectionDialog({ deviceId, physicalPinId, onCreated }: Props) {
  const [virtualNodeId, setVirtualNodeId] = useState("");
  const [virtualPinId, setVirtualPinId] = useState("in");
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createConnection() {
    if (!deviceId || !physicalPinId) return;
    setSaving(true);
    setError(null);
    try {
      const conn = await api.createHybridConnection({
        virtual_node_id: virtualNodeId,
        virtual_pin_id: virtualPinId,
        physical_device_id: deviceId,
        physical_pin_id: physicalPinId,
        workspace_id: workspaceId,
      });
      onCreated(conn);
    } catch (err) {
      setError(describeError(err, "The board didn't connect"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Hybrid Connection</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        Link a virtual workspace node pin to a physical GPIO pin for mirrored events.
      </p>
      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium text-muted">
          Virtual node ID
          <Input
            value={virtualNodeId}
            onChange={(e) => setVirtualNodeId(e.target.value)}
            placeholder="e.g. NLED001"
            className="mt-1"
          />
        </label>
        <label className="block text-xs font-medium text-muted">
          Virtual pin ID
          <Input
            value={virtualPinId}
            onChange={(e) => setVirtualPinId(e.target.value)}
            placeholder="in"
            className="mt-1"
          />
        </label>
        <label className="block text-xs font-medium text-muted">
          Workspace ID (optional)
          <Input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="WS..."
            className="mt-1"
          />
        </label>
        <p className="text-[11px] text-muted">
          Physical: {deviceId ?? "—"} · Pin: {physicalPinId ?? "—"}
        </p>
        {error ? <ErrorNotice message={error} size="sm" /> : null}
        <Button
          className="w-full"
          disabled={!deviceId || !physicalPinId || !virtualNodeId || saving}
          onClick={createConnection}
        >
          Create connection
        </Button>
      </div>
    </div>
  );
}
