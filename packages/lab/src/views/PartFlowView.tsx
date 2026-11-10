"use client";

import { useId, useMemo, useState } from "react";
import { dropBelow } from "@kiungo/core/parts/geometry";
import { typicalHeat } from "@kiungo/core/parts/power";
import type { BlockKind, CircuitBlock, CircuitLink, LinkKind, PartModel } from "@kiungo/core/parts/types";
import { cn } from "@kiungo/ui/cn";
import { planImage } from "../render3d/renderer";
import { extentOf, useInBrowser } from "./PartPlanView";

const COL = 182;
const ROW = 86;
const BW = 132;
const BH = 50;
const MARGIN = 26;

const BLOCK_TONE: Record<BlockKind, string> = {
  pin: "var(--muted)",
  power: "var(--warning)",
  ground: "var(--muted)",
  mcu: "var(--primary)",
  ic: "var(--primary)",
  passive: "var(--muted)",
  sensor: "var(--success)",
  actuator: "var(--warning)",
  connector: "var(--muted)",
  antenna: "#8b5cf6",
  regulator: "var(--warning)",
  driver: "var(--primary)",
  display: "var(--success)",
  world: "var(--success)",
};

const LINK_TONE: Record<LinkKind, string> = {
  power: "var(--warning)",
  ground: "var(--muted)",
  signal: "var(--primary)",
  data: "#8b5cf6",
  analog: "var(--success)",
  mechanical: "var(--muted)",
  rf: "#8b5cf6",
  light: "var(--warning)",
  sound: "var(--success)",
  physical: "var(--success)",
};

export const LINK_LABEL: Record<LinkKind, string> = {
  power: "Power",
  ground: "Ground",
  signal: "Digital signal",
  data: "Data",
  analog: "Analog signal",
  mechanical: "Motion",
  rf: "Radio",
  light: "Light",
  sound: "Sound",
  physical: "Heat, pressure, gas",
};

function blockRect(col: number, row: number) {
  return { x: MARGIN + col * COL, y: MARGIN + row * ROW, w: BW, h: BH };
}

/** The path between two blocks and where its label chip goes (chip center). */
function linkPath(link: CircuitLink, blocks: PartModel["circuit"]["blocks"]): { d: string; label: { x: number; y: number } } | null {
  const from = blocks.find((block) => block.id === link.from);
  const to = blocks.find((block) => block.id === link.to);
  if (!from || !to) return null;
  const a = blockRect(from.col, from.row);
  const b = blockRect(to.col, to.row);
  if (a.x === b.x) {
    // Straight down or up: the chip rides on the line.
    const down = b.y > a.y;
    const y1 = down ? a.y + a.h : a.y;
    const y2 = down ? b.y : b.y + b.h;
    const x = a.x + a.w / 2;
    return { d: `M ${x} ${y1} L ${x} ${y2}`, label: { x, y: (y1 + y2) / 2 } };
  }
  const forward = b.x > a.x;
  const x1 = forward ? a.x + a.w : a.x;
  const x2 = forward ? b.x : b.x + b.w;
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  if (a.y === b.y) {
    // Side by side: the gap is narrow, so the chip sits just above the row.
    return { d: `M ${x1} ${y1} L ${x2} ${y2}`, label: { x: (x1 + x2) / 2, y: a.y - 11 } };
  }
  const c = (x2 - x1) / 2;
  return { d: `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`, label: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 10 } };
}

/* ----- On the part ------------------------------------------------------------ */

interface Point {
  x: number;
  y: number;
}

/** Where a block is on the part: the middle of the feature or the pin it names, or the point it gives. */
function anchorOf(block: CircuitBlock, model: PartModel): Point | null {
  if (block.at === undefined) return null;
  if (typeof block.at !== "string") return block.at;
  const feature = model.features.find((f) => f.id === block.at);
  if (feature) return { x: feature.x + feature.w / 2, y: feature.y + feature.h / 2 };
  const spot = model.pinSpots?.find((s) => s.id === block.at);
  return spot ? { x: spot.x, y: spot.y } : null;
}

/** Whether the Trace view can draw a part's flow over the part itself: at least two of its blocks say where they are. */
export function tracesOnPart(model: PartModel): boolean {
  return model.circuit.blocks.filter((block) => anchorOf(block, model)).length >= 2;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The part itself, dimmed, with the flow drawn over it: a numbered marker
 * where each block really is, a line for each link between two places on the
 * part, and an arrow off the edge for what goes out into the world or comes
 * in from it. The part that gets hot glows, with its temperature.
 */
function PartXray({ model, powered, hover, onHover }: { model: PartModel; powered: boolean; hover: string | null; onHover: (id: string | null) => void }) {
  const uid = useId().replace(/:/g, "");
  const browser = useInBrowser();
  const front = model.plan === "front";
  const w = model.size.w;
  const h = front ? model.size.d + dropBelow(model) : model.size.h;
  const { blocks, links } = model.circuit;
  const anchors = useMemo(() => new Map(blocks.map((block) => [block.id, anchorOf(block, model)] as const)), [blocks, model]);
  const extents = [
    ...(front ? [] : model.solids.map(extentOf).filter((e): e is NonNullable<typeof e> => e !== null)),
    ...[...anchors.values()].filter((p): p is Point => p !== null).map((p) => ({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })),
  ];
  const box = {
    x1: Math.min(0, ...extents.map((e) => e.x1)),
    y1: Math.min(0, ...extents.map((e) => e.y1)),
    x2: Math.max(w, ...extents.map((e) => e.x2)),
    y2: Math.max(h, ...extents.map((e) => e.y2)),
  };
  const extent = Math.max(box.x2 - box.x1, box.y2 - box.y1);
  const pad = Math.max(3, extent * 0.2);
  const view = { x: box.x1 - pad, y: box.y1 - pad, w: box.x2 - box.x1 + 2 * pad, h: box.y2 - box.y1 + 2 * pad };
  const key = `${view.x}|${view.y}|${view.w}|${view.h}|${powered}`;
  const lit = powered ? (model.animate?.lit ?? []) : [];
  const image = useMemo(() => {
    if (!browser) return null;
    try {
      return planImage(model, front ? "front" : "top", view, { powered, lit });
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view and the lit list are in `key`
  }, [browser, model, front, key]);

  // Sizes follow the part: a marker on a 5 mm LED and on a 100 mm board both read.
  const k = Math.max(0.28, Math.min(2.2, extent / 46));
  const dot = 1.75 * k;
  const center = { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
  const heat = typicalHeat(model.spec);
  const touches = (link: CircuitLink) => hover === null || link.from === hover || link.to === hover;

  /** A link between two places on the part bows a little, so two links between the same places don't hide each other. */
  const curve = (a: Point, b: Point, bend: number) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return `M ${r2(a.x)} ${r2(a.y)} Q ${r2(mx - dy * bend)} ${r2(my + dx * bend)} ${r2(b.x)} ${r2(b.y)}`;
  };
  /** Where a link to the outside world ends: off the nearest edge, away from the middle of the part. */
  const outside = (p: Point): Point => {
    let dx = p.x - center.x;
    let dy = p.y - center.y;
    if (Math.hypot(dx, dy) < 0.5) {
      dx = 0;
      dy = -1;
    }
    // Leave by the side the point is nearest, straight out.
    const dist = [p.x - box.x1, box.x2 - p.x, p.y - box.y1, box.y2 - p.y];
    const side = dist.indexOf(Math.min(...dist));
    const reach = pad * 0.82;
    if (side === 0) return { x: box.x1 - reach, y: p.y };
    if (side === 1) return { x: box.x2 + reach, y: p.y };
    if (side === 2) return { x: p.x, y: box.y1 - reach };
    return { x: p.x, y: box.y2 + reach };
  };

  const seen = new Map<string, number>();
  return (
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="h-full w-full" role="img" aria-label={`The ${model.name} with the current and signals drawn over it`} data-testid="part-xray">
      <defs>
        {(Object.keys(LINK_TONE) as LinkKind[]).map((kind) => (
          <marker key={kind} id={`${uid}-arrow-${kind}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={LINK_TONE[kind]} />
          </marker>
        ))}
        <radialGradient id={`${uid}-heat`}>
          <stop offset="0" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#f59e0b" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="var(--canvas)" />
      {/* The part itself, held back so the flow reads first. */}
      {image ? <image href={image} x={view.x} y={view.y} width={view.w} height={view.h} preserveAspectRatio="none" opacity={0.5} style={{ filter: "saturate(0.35)" }} /> : <rect x={0} y={0} width={w} height={h} rx={Math.min(1.5, w * 0.05)} fill="var(--muted-bg)" stroke="var(--border)" strokeWidth={0.2 * k} />}

      {/* What gets hot. */}
      {powered
        ? blocks
            .filter((block) => block.hot && anchors.get(block.id))
            .map((block) => {
              const p = anchors.get(block.id)!;
              const feature = typeof block.at === "string" ? model.features.find((f) => f.id === block.at) : undefined;
              const radius = Math.max(dot * 2.6, feature ? Math.max(feature.w, feature.h) * 0.75 : 0);
              return (
                <g key={block.id} data-hot={block.id} pointerEvents="none">
                  <circle cx={p.x} cy={p.y} r={radius} fill={`url(#${uid}-heat)`} className="hhip-plan-glow" />
                  {heat ? (
                    // The temperature rides beside the block's marker, on the side with more room.
                    (() => {
                      const label = `≈ ${Math.round(heat.tempC)} °C`;
                      const size = dot * 1.15;
                      const tw = label.length * size * 0.62 + size * 0.9;
                      const right = p.x + dot * 1.5 + tw < view.x + view.w;
                      const x = right ? p.x + dot * 1.5 : p.x - dot * 1.5 - tw;
                      return (
                        <g>
                          <rect x={x} y={p.y - size * 0.85} width={tw} height={size * 1.7} rx={size * 0.5} fill="#b91c1c" />
                          <text x={x + tw / 2} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={700} fill="#ffffff" fontFamily="var(--font-jetbrains), monospace">
                            {label}
                          </text>
                        </g>
                      );
                    })()
                  ) : null}
                </g>
              );
            })
        : null}

      {/* The flow between places on the part, and out to the world. */}
      {links.map((link, i) => {
        const a = anchors.get(link.from) ?? null;
        const b = anchors.get(link.to) ?? null;
        if (!a && !b) return null;
        const tone = LINK_TONE[link.kind];
        let d: string;
        let far: Point | null = null;
        if (a && b) {
          if (Math.hypot(a.x - b.x, a.y - b.y) < dot * 0.8) return null;
          const pair = [link.from, link.to].sort().join("|");
          const n = seen.get(pair) ?? 0;
          seen.set(pair, n + 1);
          d = curve(a, b, 0.14 + n * 0.16);
        } else {
          // One end is out in the world: an arrow off the edge, or in from it.
          const on = (a ?? b)!;
          far = outside(on);
          d = a ? `M ${r2(on.x)} ${r2(on.y)} L ${r2(far.x)} ${r2(far.y)}` : `M ${r2(far.x)} ${r2(far.y)} L ${r2(on.x)} ${r2(on.y)}`;
        }
        const active = touches(link);
        const world = far ? blocks.find((block) => block.id === (a ? link.to : link.from)) : null;
        return (
          <g key={i} opacity={active ? 1 : 0.18} className="transition-opacity" data-flow={`${link.from}>${link.to}`}>
            <path d={d} fill="none" stroke="var(--canvas)" strokeWidth={0.95 * k} strokeLinecap="round" opacity={0.9} />
            <path d={d} fill="none" stroke={tone} strokeWidth={0.5 * k} strokeLinecap="round" markerEnd={`url(#${uid}-arrow-${link.kind})`} markerStart={link.both ? `url(#${uid}-arrow-${link.kind})` : undefined} opacity={powered ? 0.5 : 0.85} strokeDasharray={far ? `${1.1 * k} ${0.9 * k}` : undefined} />
            {powered ? <path d={d} fill="none" stroke={tone} strokeWidth={0.5 * k} strokeLinecap="round" strokeDasharray={`${1.4 * k} ${2.4 * k}`} className="hhip-flow-dash" /> : null}
            {far && world ? (
              <text
                x={far.x}
                y={far.y}
                textAnchor={far.x < box.x1 ? "end" : far.x > box.x2 ? "start" : "middle"}
                dominantBaseline={far.y < box.y1 ? "text-after-edge" : far.y > box.y2 ? "text-before-edge" : "central"}
                dx={far.x < box.x1 ? -0.5 * k : far.x > box.x2 ? 0.5 * k : 0}
                fontSize={1.5 * k}
                fontWeight={600}
                fill="var(--foreground)"
                stroke="var(--canvas)"
                strokeWidth={0.4 * k}
                paintOrder="stroke"
                fontFamily="var(--font-inter), sans-serif"
              >
                {world.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* A numbered marker where each block is. */}
      {blocks.map((block, i) => {
        const p = anchors.get(block.id);
        if (!p) return null;
        const tone = BLOCK_TONE[block.kind];
        const on = hover === block.id;
        return (
          <g key={block.id} data-marker={block.id} className="cursor-pointer" onMouseEnter={() => onHover(block.id)} onMouseLeave={() => onHover(null)} opacity={hover === null || on ? 1 : 0.55}>
            <title>{`${block.label}. ${block.note}`}</title>
            <circle cx={p.x} cy={p.y} r={dot * (on ? 1.25 : 1)} fill="var(--surface)" stroke={on ? "var(--primary)" : tone} strokeWidth={(on ? 0.5 : 0.36) * k} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={dot * 1.15} fontWeight={700} fill="var(--foreground)" fontFamily="var(--font-jetbrains), monospace">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ----- The view ---------------------------------------------------------------- */

/**
 * How a part works inside.
 *
 * In the Component library it has two halves that light up together: the part
 * itself with the flow drawn over it (where things are), and a diagram of its
 * blocks and what passes between them (how it works), then a note for
 * whatever is pointed at and the numbered steps. A part whose blocks don't
 * say where they are shows the diagram alone.
 *
 * `compact` is for small fixed-height boxes like the lab's Inspector: the
 * diagram fills the box and the hover note is one line laid over its foot;
 * the steps are left to the host to show elsewhere.
 */
export function PartFlowView({ model, powered, className, compact = false }: { model: PartModel; powered: boolean; className?: string; compact?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const { blocks, links, steps } = model.circuit;
  const cols = Math.max(...blocks.map((block) => block.col)) + 1;
  const rows = Math.max(...blocks.map((block) => block.row)) + 1;
  const width = MARGIN * 2 + (cols - 1) * COL + BW;
  const height = MARGIN * 2 + (rows - 1) * ROW + BH;
  const hovered = blocks.find((block) => block.id === hover) ?? null;
  const touches = (link: CircuitLink) => hover === null || link.from === hover || link.to === hover;
  const onPart = !compact && tracesOnPart(model);
  const heat = typicalHeat(model.spec);
  const hot = blocks.find((block) => block.hot);

  const diagram = (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-full w-full" style={{ maxWidth: width * 1.4 }} role="img" aria-label={`How the ${model.name} works inside: ${blocks.length} blocks and ${links.length} connections`}>
      <defs>
        {(Object.keys(LINK_TONE) as LinkKind[]).map((kind) => (
          <marker key={kind} id={`flow-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={LINK_TONE[kind]} />
          </marker>
        ))}
      </defs>

      {links.map((link, i) => {
        const path = linkPath(link, blocks);
        if (!path) return null;
        const tone = LINK_TONE[link.kind];
        const active = touches(link);
        return (
          <g key={i} opacity={active ? 1 : 0.22} className="transition-opacity">
            <path d={path.d} fill="none" stroke={tone} strokeWidth={2.2} strokeLinecap="round" markerEnd={`url(#flow-arrow-${link.kind})`} markerStart={link.both ? `url(#flow-arrow-${link.kind})` : undefined} opacity={0.55} />
            {powered ? <path d={path.d} fill="none" stroke={tone} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="5 9" className="hhip-flow-dash" /> : null}
            {link.label ? (
              <g>
                <rect x={path.label.x - link.label.length * 3.2 - 5} y={path.label.y - 7} width={link.label.length * 6.4 + 10} height={14} rx={4} fill="var(--surface)" stroke={tone} strokeWidth={0.8} />
                <text x={path.label.x} y={path.label.y + 3.5} textAnchor="middle" fontSize="10" fill="var(--foreground)" fontFamily="var(--font-jetbrains), monospace">
                  {link.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {blocks.map((block, i) => {
        const r = blockRect(block.col, block.row);
        const tone = BLOCK_TONE[block.kind];
        const isHover = hover === block.id;
        const warm = powered && block.hot;
        return (
          <g
            key={block.id}
            role="button"
            tabIndex={0}
            aria-label={`${block.label}${block.sub ? `, ${block.sub}` : ""}`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => setHover(block.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(block.id)}
            onBlur={() => setHover(null)}
            data-block={block.id}
          >
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} fill={warm ? "color-mix(in srgb, #ef4444 9%, var(--surface))" : "var(--surface)"} stroke={isHover ? "var(--primary)" : warm ? "#ef4444" : "var(--border)"} strokeWidth={isHover ? 2 : 1.2} />
            <rect x={r.x} y={r.y + 8} width={4} height={r.h - 16} rx={2} fill={tone} />
            <text x={r.x + 14} y={r.y + (block.sub ? 22 : 29)} fontSize="13" fontWeight={600} fill="var(--foreground)" fontFamily="var(--font-inter), sans-serif">
              {block.label}
            </text>
            {block.sub ? (
              <text x={r.x + 14} y={r.y + 38} fontSize="10.5" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
                {block.sub}
              </text>
            ) : null}
            {onPart ? (
              // The number that finds this block on the part.
              <g aria-hidden>
                <circle cx={r.x + r.w - 13} cy={r.y + r.h - 13} r={8} fill="var(--surface)" stroke={isHover ? "var(--primary)" : tone} strokeWidth={1.3} />
                <text x={r.x + r.w - 13} y={r.y + r.h - 13} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fontWeight={700} fill="var(--foreground)" fontFamily="var(--font-jetbrains), monospace">
                  {i + 1}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );

  const note = hovered ? (
    <>
      <span className="font-semibold">{hovered.label}.</span> <span className="text-muted">{hovered.note}</span>
    </>
  ) : null;

  if (compact) {
    return (
      <div className={cn("relative flex h-full flex-col", className)} data-testid="part-flow" data-compact>
        <div className="min-h-0 flex-1 overflow-hidden rounded-[12px] bg-canvas p-1.5 pb-8">{diagram}</div>
        <p className="absolute inset-x-0 bottom-0 truncate rounded-b-[12px] border-t border-border bg-surface/95 px-3 py-1.5 text-[11.5px] leading-4 backdrop-blur" aria-live="polite" title={hovered ? `${hovered.label}. ${hovered.note}` : undefined} data-testid="part-flow-note">
          {note ?? <span className="text-muted">{powered ? "Current flows along the highlighted paths. Hover a block." : "Hover a block to see what it does."}</span>}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("@container flex h-full flex-col", className)} data-testid="part-flow">
      <div className={cn("min-h-0 flex-1", onPart && "grid gap-3 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]")}>
        {onPart ? (
          <figure className="m-0 flex min-h-[220px] flex-col overflow-hidden rounded-[12px] border border-border bg-canvas @3xl:min-h-[300px]">
            <figcaption className="shrink-0 border-b border-border px-3 py-1.5 text-xs font-medium text-muted">On the part: where each numbered block is</figcaption>
            <div className="min-h-0 flex-1 p-2">
              <PartXray model={model} powered={powered} hover={hover} onHover={setHover} />
            </div>
          </figure>
        ) : null}
        <figure className={cn("m-0 flex min-h-0 flex-col rounded-[12px] bg-canvas", onPart ? "overflow-hidden border border-border" : "h-full overflow-auto")}>
          {onPart ? <figcaption className="shrink-0 border-b border-border px-3 py-1.5 text-xs font-medium text-muted">Inside: what each block does and what flows between them</figcaption> : null}
          <div className={cn("min-h-0 flex-1", onPart && "overflow-auto p-1")}>{diagram}</div>
        </figure>
      </div>

      {powered && hot && heat ? (
        <p className="mt-3 shrink-0 rounded-[10px] border border-[color-mix(in_srgb,#ef4444_35%,var(--border))] bg-[color-mix(in_srgb,#ef4444_6%,var(--surface))] px-4 py-2 text-sm leading-6" data-testid="part-flow-heat">
          <span className="font-semibold">Heat.</span>{" "}
          <span className="text-muted">
            About {heat.watts >= 1 ? `${Math.round(heat.watts * 10) / 10} W` : `${Math.round(heat.watts * 1000)} mW`} turns into heat {heat.condition}, at the block marked in red ({hot.label}): around {Math.round(heat.tempC)} °C in a 25 °C room
            {heat.over ? `, past its ${model.spec!.thermal!.maxC} °C limit.` : `. Its limit is ${model.spec!.thermal!.maxC} °C.`}
          </span>
        </p>
      ) : null}

      <div className="mt-3 min-h-[3.25rem] shrink-0 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-sm leading-6" aria-live="polite">
        {note ?? <span className="text-muted">Hover a block to see what it does. {powered ? "Current is flowing along the highlighted paths." : "Switch the power on to see current flow."}</span>}
      </div>

      <ol className="mt-4 shrink-0 space-y-2 text-sm leading-6" aria-label="How it works">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted-bg font-mono text-xs font-semibold text-foreground">
              {i + 1}
            </span>
            <span className="text-muted">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
