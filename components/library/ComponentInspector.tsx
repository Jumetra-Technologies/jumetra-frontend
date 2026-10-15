"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ComponentV2Detail, ComponentV2SearchHit } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

type Props = {
  componentId?: string | null;
  fallback?: ComponentV2SearchHit | null;
};

export function ComponentInspector({ componentId, fallback }: Props) {
  const [loaded, setDetail] = useState<ComponentV2Detail | null>(null);
  // With no component chosen, show the fallback straight away.
  const detail = componentId ? loaded : ((fallback as ComponentV2Detail | null) ?? null);

  useEffect(() => {
    if (!componentId) return;
    let cancelled = false;
    api
      .getComponentV2(componentId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail((fallback as ComponentV2Detail) || null);
      });
    return () => {
      cancelled = true;
    };
  }, [componentId, fallback]);

  if (!detail) {
    return (
      <div className="p-3 text-xs text-muted" data-testid="component-inspector-empty">
        Select a component to inspect datasheet, pins, and capabilities.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-xs" data-testid="component-inspector">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{detail.name}</h3>
        <p className="text-muted">{detail.manufacturer}</p>
      </div>
      <p className="text-muted">{detail.description}</p>
      <div className="flex flex-wrap gap-1">
        {(detail.interfaces || []).map((i) => (
          <Badge key={i} variant="info">
            {i}
          </Badge>
        ))}
      </div>
      <div className="space-y-1">
        <p className="font-semibold">Simulation</p>
        <p className="text-muted">
          {detail.simulation?.supported !== false ? "Supported" : "Unsupported"} ·{" "}
          {detail.simulation?.behavior || "—"}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-semibold">Physical</p>
        <p className="text-muted">
          {detail.hardware?.physical_supported ? "Supported" : "Virtual only"}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-semibold">Pins</p>
        <ul className="space-y-1">
          {(detail.pins || []).map((p) => (
            <li key={p.id} className="flex justify-between gap-2 font-mono text-[10px]">
              <span>{p.name}</span>
              <span className="text-muted">
                {p.type} · {p.voltage ?? "—"}V
              </span>
            </li>
          ))}
        </ul>
      </div>
      {detail.datasheet ? (
        <div className="space-y-1">
          <p className="font-semibold">Datasheet</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[10px]">
            {detail.datasheet}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
