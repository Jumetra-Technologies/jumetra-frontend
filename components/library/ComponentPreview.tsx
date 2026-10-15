"use client";

import type { ComponentV2SearchHit } from "@/lib/types";
import { HardwareComponentRenderer } from "./HardwareComponentRenderer";

type Props = {
  item: ComponentV2SearchHit | null;
};

export function ComponentPreview({ item }: Props) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-sidebar-muted">
        Select a component to preview
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3" data-testid="component-preview">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted">Preview</p>
      <div className="flex justify-center">
        <HardwareComponentRenderer component={item} interactivePins={false} />
      </div>
      <p className="text-center text-xs text-white">{item.name}</p>
      <p className="text-center text-[10px] text-sidebar-muted">
        {item.pins?.length ?? 0} pins · {(item.interfaces || []).join(", ")}
      </p>
    </div>
  );
}
