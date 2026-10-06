import { flatColor } from "@/lib/parts/build";
import type { PartModel, Solid } from "@/lib/parts/types";
import { cn } from "@/lib/utils";

/** A tiny top-down silhouette of a part, for lists. */
export function PartThumb({ model, className }: { model: PartModel; className?: string }) {
  const { w, h } = model.size;
  const pad = Math.max(w, h) * 0.08;
  const side = Math.max(w, h) + pad * 2;
  const ox = (side - w) / 2;
  const oy = (side - h) / 2;
  const shapes = model.solids.filter((solid) => solid.kind === "box" || solid.kind === "cyl" || solid.kind === "dome");
  return (
    <svg viewBox={`${-ox} ${-oy} ${side} ${side}`} className={cn("rounded-[8px] bg-muted-bg", className)} aria-hidden>
      {shapes.map((solid: Solid, i) => {
        if (solid.kind === "box") {
          return <rect key={i} x={solid.x} y={solid.y} width={solid.w} height={solid.h} rx={solid.radius ?? 0.3} fill={solid.fill ?? flatColor(solid.top)} />;
        }
        if (solid.kind === "cyl") {
          return <circle key={i} cx={solid.cx} cy={solid.cy} r={solid.r} fill={solid.fill ?? flatColor(solid.top)} />;
        }
        if (solid.kind === "dome") {
          return <circle key={i} cx={solid.cx} cy={solid.cy} r={solid.r} fill={solid.color} />;
        }
        return null;
      })}
    </svg>
  );
}
