import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { DeviceSummary } from "@/lib/types";
import { formatMs } from "@/lib/utils";

export default async function DevicesPage() {
  let devices: DeviceSummary[] = [];
  try {
    devices = await api.getDevices();
  } catch {
    devices = [];
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Devices</h2>
        <p className="mt-1 text-zinc-500">Connected hardware and observed virtual devices</p>
      </div>

      {devices.length === 0 ? (
        <Card>
          <p className="text-zinc-500">No devices found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((device) => (
            <Link key={device.device_id} href={`/devices/${device.device_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold">{device.device_id}</h3>
                  <Badge variant={device.status === "connected" ? "success" : "default"}>
                    {device.status}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">Reliability</dt>
                    <dd className="font-medium">{device.reliability_score.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Health</dt>
                    <dd className="font-medium">{(device.health_score * 100).toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Sync Error</dt>
                    <dd className="font-medium">{formatMs(device.average_sync_error)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Experiments</dt>
                    <dd className="font-medium">{device.experiment_count}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
