import type { LayerId, Relationship } from "./model";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export type BoardLayoutId = "wide" | "narrow";

export interface BoardLayout {
  id: BoardLayoutId;
  width: number;
  height: number;
  nodes: Record<LayerId, Rect>;
}

/**
 * Both layouts share one topology: the two apps on top, the communication
 * layer as a full-width bus in the middle, and the two hardware layers below.
 * Every trace is a single straight run, so a pulse along it reads clearly.
 */
export const BOARD_LAYOUTS: Record<BoardLayoutId, BoardLayout> = {
  wide: {
    id: "wide",
    width: 760,
    height: 544,
    nodes: {
      web: { x: 32, y: 28, w: 280, h: 112 },
      desktop: { x: 448, y: 28, w: 280, h: 112 },
      comm: { x: 32, y: 216, w: 696, h: 112 },
      virtual: { x: 32, y: 404, w: 280, h: 112 },
      physical: { x: 448, y: 404, w: 280, h: 112 },
    },
  },
  narrow: {
    id: "narrow",
    width: 360,
    height: 452,
    nodes: {
      web: { x: 10, y: 12, w: 150, h: 96 },
      desktop: { x: 200, y: 12, w: 150, h: 96 },
      comm: { x: 10, y: 178, w: 340, h: 96 },
      virtual: { x: 10, y: 344, w: 150, h: 96 },
      physical: { x: 200, y: 344, w: 150, h: 96 },
    },
  },
};

function centerX(rect: Rect): number {
  return rect.x + rect.w / 2;
}

function centerY(rect: Rect): number {
  return rect.y + rect.h / 2;
}

/**
 * Start and end points of the trace from `from` to `to`.
 * Stacked nodes join vertically under the narrower node's centre;
 * side-by-side nodes join horizontally at the shared row's centre.
 */
export function traceBetween(layout: BoardLayout, from: LayerId, to: LayerId): [Point, Point] {
  const a = layout.nodes[from];
  const b = layout.nodes[to];

  const aAbove = a.y + a.h <= b.y;
  const bAbove = b.y + b.h <= a.y;
  if (aAbove || bAbove) {
    const x = centerX(a.w <= b.w ? a : b);
    return aAbove
      ? [{ x, y: a.y + a.h }, { x, y: b.y }]
      : [{ x, y: a.y }, { x, y: b.y + b.h }];
  }

  const y = centerY(a);
  return a.x < b.x
    ? [{ x: a.x + a.w, y }, { x: b.x, y }]
    : [{ x: a.x, y }, { x: b.x + b.w, y }];
}

export function relationshipTrace(layout: BoardLayout, relationship: Relationship): [Point, Point] {
  return traceBetween(layout, relationship.from, relationship.to);
}

/** Every point where a trace meets this node, so pin legs can leave room for the pad. */
export function anchorsOn(layout: BoardLayout, layer: LayerId, relationships: Relationship[]): Point[] {
  const points: Point[] = [];
  for (const relationship of relationships) {
    const [start, end] = relationshipTrace(layout, relationship);
    if (relationship.from === layer) points.push(start);
    if (relationship.to === layer) points.push(end);
  }
  return points;
}
