import Link from "next/link";
import { getArticle } from "@/lib/learning";
import { shortName } from "@kiungo/core/lab/session";
import { getPartsByGroup } from "@kiungo/core/parts";

/** Reference pages that exist for a part, so its name can link straight to one. */
const DOC_FOR: Record<string, string> = {
  "arduino-uno": "/docs/hardware-knowledge/arduino-uno",
  esp32: "/docs/hardware-knowledge/esp32-devkit",
  dht11: "/docs/hardware-knowledge/dht11",
  "hc-sr04": "/docs/hardware-knowledge/hc-sr04",
  pir: "/docs/hardware-knowledge/pir-sensor",
  servo: "/docs/hardware-knowledge/servo-motor",
};

/** Every part in the Component library, by its groups. A part with a reference page links to it; the rest open in the library. */
export function PartsList() {
  return (
    <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2" data-testid="parts-list">
      {getPartsByGroup().map(({ group, parts }) => (
        <div key={group.id}>
          <dt className="text-sm font-semibold text-foreground">{group.title}</dt>
          <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-muted">
            {parts.map((part) => {
              const doc = DOC_FOR[part.id];
              const [category, slug] = doc ? doc.split("/").slice(2) : [];
              const linked = doc && getArticle(category, slug);
              return linked ? (
                <Link key={part.id} href={doc} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">
                  {shortName(part.id)}
                </Link>
              ) : (
                <Link key={part.id} href={`/components?part=${part.id}`} className="hover:text-foreground">
                  {shortName(part.id)}
                </Link>
              );
            })}
          </dd>
        </div>
      ))}
    </dl>
  );
}
