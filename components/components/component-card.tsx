"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ComponentSpec, CompatibilityResult } from "@/lib/types";

export function ComponentCard({
  component,
  compatibleControllers = [],
}: {
  component: ComponentSpec;
  compatibleControllers?: string[];
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{component.name}</h3>
          <p className="font-mono text-xs text-muted">{component.component_id}</p>
        </div>
        <Badge>{component.category}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted">{component.description}</p>
      <div className="mt-4 flex flex-wrap gap-1">
        {component.interfaces.map((iface) => (
          <Badge key={iface} variant="info">
            {iface}
          </Badge>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted">Voltage</dt>
          <dd className="font-medium text-foreground">{component.voltage_v}V</dd>
        </div>
        <div>
          <dt className="text-muted">Pins</dt>
          <dd className="font-medium text-foreground">{component.pins.count}</dd>
        </div>
      </dl>
      {compatibleControllers.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Compatible: {compatibleControllers.slice(0, 3).join(", ")}
          {compatibleControllers.length > 3 ? "…" : ""}
        </p>
      ) : null}
    </Card>
  );
}

export function CompatibilityPanel({ results }: { results: CompatibilityResult[] }) {
  if (!results.length) {
    return <p className="text-sm text-muted">No compatibility data.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {results.map((r) => (
        <li
          key={r.controller_id}
          className="rounded-[12px] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{r.controller_id}</span>
            <Badge variant={r.compatible ? "success" : "warning"}>
              {r.compatible ? "Compatible" : "Incompatible"}
            </Badge>
          </div>
          {r.reasons[0] ? <p className="mt-1 text-xs text-muted">{r.reasons[0]}</p> : null}
        </li>
      ))}
    </ul>
  );
}
