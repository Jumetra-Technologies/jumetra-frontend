import Link from "next/link";
import { HARDWARE_ASSETS } from "@/lib/hardware/asset-data";
import { getArticle } from "@/lib/learning";

const GROUPS: Array<{ label: string; categories: string[] }> = [
  { label: "Boards", categories: ["arduino", "esp32", "pico", "stm32"] },
  { label: "Sensors and inputs", categories: ["sensors"] },
  { label: "Actuators", categories: ["robotics"] },
  { label: "Displays", categories: ["displays"] },
  { label: "Passives and prototyping", categories: ["passive", "prototyping"] },
];

/** Reference pages that exist for a part, so its name can link straight to one. */
const DOC_FOR: Record<string, string> = {
  "arduino-uno": "/docs/hardware-knowledge/arduino-uno",
  esp32: "/docs/hardware-knowledge/esp32-devkit",
  dht11: "/docs/hardware-knowledge/dht11",
  "hc-sr04": "/docs/hardware-knowledge/hc-sr04",
  pir: "/docs/hardware-knowledge/pir-sensor",
  servo: "/docs/hardware-knowledge/servo-motor",
};

export function PartsList() {
  const assets = Object.values(HARDWARE_ASSETS);
  return (
    <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2" data-testid="parts-list">
      {GROUPS.map((group) => {
        const parts = assets.filter((asset) => group.categories.includes(asset.metadata.category));
        if (parts.length === 0) return null;
        return (
          <div key={group.label}>
            <dt className="text-sm font-semibold text-foreground">{group.label}</dt>
            <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-muted">
              {parts.map((asset) => {
                const href = DOC_FOR[asset.metadata.id];
                const [category, slug] = href ? href.split("/").slice(2) : [];
                const linked = href && getArticle(category, slug);
                return linked ? (
                  <Link key={asset.metadata.id} href={href} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">
                    {asset.metadata.name}
                  </Link>
                ) : (
                  <span key={asset.metadata.id}>{asset.metadata.name}</span>
                );
              })}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
