"use client";

import { useId, type KeyboardEvent } from "react";
import { CircuitBoard, Laptop, Monitor, Network, Usb, type LucideIcon } from "lucide-react";
import { BOARD_LAYOUTS, anchorsOn, relationshipTrace, type BoardLayoutId, type Rect } from "@/lib/architecture/geometry";
import {
  LAYERS,
  RELATIONSHIPS,
  layerPresence,
  layerTag,
  relationshipPresence,
  type Layer,
  type LayerId,
  type PresenceState,
  type ViewId,
} from "@/lib/architecture/model";
import { cn } from "@/lib/utils";

export const LAYER_ICONS: Record<LayerId, LucideIcon> = {
  web: Monitor,
  desktop: Laptop,
  comm: Network,
  virtual: CircuitBoard,
  physical: Usb,
};

/** What the board should draw attention to. */
export interface BoardFocus {
  layers: LayerId[];
  relationships: string[];
  /** A relationship carrying data right now, drawn with a moving pulse. */
  signal?: { id: string; reversed: boolean };
  /** Fade everything outside the focus (used while following a data flow). */
  dimOthers?: boolean;
}

interface SystemBoardProps {
  layout: BoardLayoutId;
  view: ViewId;
  selected: LayerId | null;
  focus: BoardFocus;
  onSelect: (id: LayerId) => void;
  className?: string;
}

const PIN_SPACING = { wide: 18, narrow: 14 } as const;
const PROTOCOLS = ["HTTP", "WebSocket", "USB serial"];

function tagTone(view: ViewId, layer: Layer): "success" | "warning" | "primary" | "muted" {
  if (view === "now") {
    if (layer.code.status === "live") return "success";
    if (layer.code.status === "not-started") return "muted";
    return "warning";
  }
  if (view === "phase1") return layer.phase === 1 ? "primary" : "muted";
  return layer.phase === 1 ? "success" : "primary";
}

const TONE_VAR = {
  success: "var(--success)",
  warning: "var(--warning)",
  primary: "var(--primary)",
  muted: "var(--muted)",
} as const;

/** Pin legs along the top and bottom of a package, leaving gaps where traces land. */
function PinLegs({ rect, spacing, anchors }: { rect: Rect; spacing: number; anchors: number[] }) {
  const legs: number[] = [];
  for (let x = rect.x + spacing; x <= rect.x + rect.w - spacing; x += spacing) {
    if (anchors.every((anchor) => Math.abs(anchor - x) > spacing * 0.6)) legs.push(x);
  }
  return (
    <g fill="var(--arch-trace)" aria-hidden>
      {legs.map((x) => (
        <g key={x}>
          <rect x={x - 2.5} y={rect.y - 6} width={5} height={6} rx={1} />
          <rect x={x - 2.5} y={rect.y + rect.h} width={5} height={6} rx={1} />
        </g>
      ))}
    </g>
  );
}

export function SystemBoard({ layout: layoutId, view, selected, focus, onSelect, className }: SystemBoardProps) {
  const uid = useId().replace(/:/g, "");
  const layout = BOARD_LAYOUTS[layoutId];
  const wide = layoutId === "wide";
  const titleId = `${uid}-title`;

  const handleKey = (event: KeyboardEvent<SVGGElement>, id: LayerId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  const isFocusedLayer = (id: LayerId) => focus.layers.includes(id);
  const isFocusedRelationship = (id: string) => focus.relationships.includes(id);

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={cn("block h-auto w-full select-none", className)}
      role="group"
      aria-labelledby={titleId}
      style={{ ["--arch-trace" as string]: "color-mix(in srgb, var(--muted) 55%, transparent)" }}
    >
      <title id={titleId}>Kiungo system diagram</title>
      <defs>
        <pattern id={`${uid}-grid`} width={wide ? 20 : 14} height={wide ? 20 : 14} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="var(--canvas-grid)" />
        </pattern>
        <marker
          id={`${uid}-arrow`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
        </marker>
      </defs>

      <rect width={layout.width} height={layout.height} fill={`url(#${uid}-grid)`} />

      {/* Traces */}
      {RELATIONSHIPS.map((relationship) => {
        const [start, end] = relationshipTrace(layout, relationship);
        const presence = relationshipPresence(view, relationship);
        const focused = isFocusedRelationship(relationship.id);
        const signal = focus.signal?.id === relationship.id ? focus.signal : undefined;
        const dimmed = focus.dimOthers && !focused;
        const [a, rawB] = signal?.reversed ? [end, start] : [start, end];
        // Stop the pulse at the pad's rim so the arrowhead stays visible.
        const length = Math.hypot(rawB.x - a.x, rawB.y - a.y) || 1;
        const inset = wide ? 8 : 7;
        const b = { x: rawB.x - ((rawB.x - a.x) / length) * inset, y: rawB.y - ((rawB.y - a.y) / length) * inset };
        const horizontal = start.y === end.y;
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

        return (
          <g
            key={relationship.id}
            data-relationship={relationship.id}
            data-presence={presence}
            className="transition-opacity duration-300"
            opacity={dimmed ? 0.25 : 1}
            aria-hidden
          >
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={focused ? "var(--primary)" : "var(--arch-trace)"}
              strokeWidth={focused ? 3.5 : 3}
              strokeLinecap="round"
              strokeDasharray={presence === "planned" ? (focused ? "8 7" : "2 8") : undefined}
              opacity={presence === "planned" && !focused ? 0.7 : 1}
              className="transition-[stroke] duration-300"
            />
            {[start, end].map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={wide ? 5 : 4}
                fill="var(--surface)"
                stroke={focused ? "var(--primary)" : "var(--arch-trace)"}
                strokeWidth={2}
              />
            ))}
            {signal ? (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--primary-foreground)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 20"
                className="arch-signal"
                markerEnd={`url(#${uid}-arrow)`}
                data-signal
              />
            ) : null}
            {wide ? (
              <text
                x={horizontal ? mid.x : mid.x + 14}
                y={horizontal ? mid.y - 12 : mid.y + 4}
                textAnchor={horizontal ? "middle" : "start"}
                fontSize={13}
                fontWeight={focused ? 600 : 500}
                fill={focused ? "var(--primary)" : "var(--muted)"}
              >
                {relationship.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Layer packages */}
      {LAYERS.map((layer) => {
        const rect = layout.nodes[layer.id];
        const presence: PresenceState = layerPresence(view, layer);
        const isSelected = selected === layer.id;
        const focused = isFocusedLayer(layer.id);
        const dimmed = focus.dimOthers && !focused;
        const Icon = LAYER_ICONS[layer.id];
        const tag = layerTag(view, layer);
        const tone = TONE_VAR[tagTone(view, layer)];
        const planned = presence === "planned";
        const anchors = anchorsOn(layout, layer.id, RELATIONSHIPS)
          .filter((point) => point.y === rect.y || point.y === rect.y + rect.h)
          .map((point) => point.x);
        const isBus = layer.id === "comm";

        const stroke = focused || isSelected
          ? "var(--primary)"
          : presence === "partial"
            ? "color-mix(in srgb, var(--warning) 50%, var(--border))"
            : planned
              ? "var(--arch-trace)"
              : "var(--border)";

        const iconBox = wide ? 36 : 28;
        const iconSize = wide ? 18 : 15;
        const pad = wide ? 18 : 12;
        const tagWidth = Math.round(tag.length * (wide ? 6.9 : 5.7) + (wide ? 22 : 14));
        const tagHeight = wide ? 24 : 18;
        const tagY = rect.y + pad + (iconBox - tagHeight) / 2;

        return (
          <g
            key={layer.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${layer.name}: ${tag}`}
            data-layer={layer.id}
            data-presence={presence}
            onClick={() => onSelect(layer.id)}
            onKeyDown={(event) => handleKey(event, layer.id)}
            className="group cursor-pointer outline-none transition-opacity duration-300"
            opacity={dimmed ? 0.4 : 1}
          >
            {/* Focus ring for keyboard users */}
            <rect
              x={rect.x - 7}
              y={rect.y - 13}
              width={rect.w + 14}
              height={rect.h + 26}
              rx={16}
              fill="none"
              stroke="var(--ring)"
              strokeWidth={2}
              className="opacity-0 group-focus-visible:opacity-100"
            />
            <PinLegs rect={rect} spacing={PIN_SPACING[layout.id]} anchors={anchors} />
            {isSelected ? (
              <rect
                x={rect.x - 4}
                y={rect.y - 4}
                width={rect.w + 8}
                height={rect.h + 8}
                rx={15}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.3}
                strokeWidth={4}
              />
            ) : null}
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              rx={11}
              fill={planned ? "var(--canvas)" : "var(--surface)"}
              stroke={stroke}
              strokeWidth={focused || isSelected ? 2.5 : 1.5}
              strokeDasharray={planned && !focused && !isSelected ? "6 5" : undefined}
              className="transition-[stroke] duration-300 group-hover:[stroke:var(--primary)]"
            />
            {/* Pin-one mark, as on a chip package */}
            <circle cx={rect.x + (wide ? 11 : 8)} cy={rect.y + (wide ? 11 : 8)} r={wide ? 2.5 : 2} fill="var(--arch-trace)" />

            <rect
              x={rect.x + pad}
              y={rect.y + pad}
              width={iconBox}
              height={iconBox}
              rx={wide ? 9 : 7}
              fill="var(--muted-bg)"
              stroke="var(--border)"
            />
            <Icon
              x={rect.x + pad + (iconBox - iconSize) / 2}
              y={rect.y + pad + (iconBox - iconSize) / 2}
              width={iconSize}
              height={iconSize}
              color={planned ? "var(--muted)" : "var(--primary)"}
              strokeWidth={2}
              aria-hidden
            />

            <g transform={`translate(${rect.x + rect.w - pad - tagWidth}, ${tagY})`}>
              <rect
                width={tagWidth}
                height={tagHeight}
                rx={tagHeight / 2}
                fill={`color-mix(in srgb, ${tone} 13%, transparent)`}
                stroke={`color-mix(in srgb, ${tone} 35%, transparent)`}
              />
              <text
                x={tagWidth / 2}
                y={tagHeight / 2 + (wide ? 4.5 : 3.5)}
                textAnchor="middle"
                fontSize={wide ? 12 : 10}
                fontWeight={600}
                fill={tone}
              >
                {tag}
              </text>
            </g>

            <text x={rect.x + pad} y={rect.y + rect.h - (wide ? 38 : 32)} fontSize={wide ? 17 : 12.5} fontWeight={600} fill="var(--foreground)">
              {layer.name}
            </text>
            <text x={rect.x + pad} y={rect.y + rect.h - (wide ? 16 : 15)} fontSize={wide ? 13 : 10.5} fill="var(--muted)">
              {layer.role}
            </text>

            {/* The bus lists the protocols it actually carries today */}
            {isBus && wide ? (
              <g aria-hidden>
                {PROTOCOLS.map((protocol, index) => {
                  const width = protocol.length * 7.4 + 22;
                  const offset = PROTOCOLS.slice(0, index).reduce((sum, item) => sum + item.length * 7.4 + 22 + 8, 0);
                  const total = PROTOCOLS.reduce((sum, item) => sum + item.length * 7.4 + 22, 0) + 8 * (PROTOCOLS.length - 1);
                  const x = rect.x + rect.w - pad - total + offset;
                  const y = rect.y + rect.h - 16 - 26 + 4;
                  return (
                    <g key={protocol} transform={`translate(${x}, ${y})`}>
                      <rect width={width} height={26} rx={6} fill="var(--muted-bg)" stroke="var(--border)" />
                      <text x={width / 2} y={17} textAnchor="middle" fontSize={12} className="font-mono" fill="var(--foreground)">
                        {protocol}
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
