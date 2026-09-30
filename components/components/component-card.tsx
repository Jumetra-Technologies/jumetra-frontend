"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Cable, Cpu, Gauge, ImageOff, Zap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ComponentSpec, CompatibilityResult } from "@/lib/types";

export function ComponentCard({
  component,
  compatibleControllers = [],
}: {
  component: ComponentSpec;
  compatibleControllers?: string[];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const assetPath = `/assets/components/${component.component_id}/component.svg`;
  const categoryLabel = component.category.replace(/[-_]/g, " ");

  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_55%,#ecfdf5_100%)] px-8 py-5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-border/70" />
        {imageFailed ? <ImageOff className="size-10 text-muted/40" aria-hidden /> : <Image src={assetPath} alt="" width={300} height={200} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onError={() => setImageFailed(true)} />}
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm">{categoryLabel}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{component.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted">{component.component_id}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted" title="Popularity order">
            <Gauge className="size-3.5" aria-hidden />
            <span>Common</span>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">{component.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {component.interfaces.map((iface) => <Badge key={iface} variant="info">{iface}</Badge>)}
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
          <div><dt className="flex items-center gap-1 text-muted"><Zap className="size-3" aria-hidden /> Voltage</dt><dd className="mt-1 font-medium text-foreground">{component.voltage_v}V</dd></div>
          <div><dt className="flex items-center gap-1 text-muted"><Cable className="size-3" aria-hidden /> Pins</dt><dd className="mt-1 font-medium text-foreground">{component.pins.count}</dd></div>
          <div><dt className="flex items-center gap-1 text-muted"><Cpu className="size-3" aria-hidden /> Current</dt><dd className="mt-1 font-medium text-foreground">{component.current_ma}mA</dd></div>
        </dl>
        {compatibleControllers.length > 0 ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
            Compatible: {compatibleControllers.slice(0, 3).join(", ")}
            {compatibleControllers.length > 3 ? "…" : ""}
          </p>
        ) : null}
      </div>
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
