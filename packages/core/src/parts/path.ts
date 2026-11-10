/**
 * SVG path data as plain polylines, in the path's own units.
 *
 * Part outlines are written as SVG paths ("M 0 0 H 20 V 10 Z") because that
 * is what people draw in. The 3D renderer needs points to build a shape from,
 * the 2D fallback needs a bounding box, and neither should need a browser, so
 * this file reads the commands itself: M L H V C S Q T A Z, absolute or
 * relative, with curves and arcs sampled finely enough for millimeter work.
 */

export interface Pt {
  x: number;
  y: number;
}

const COMMAND = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi;

/** Points along an elliptical arc, by the SVG endpoint rules (F.6.5 of the SVG spec). */
function arc(from: Pt, rx: number, ry: number, rotation: number, large: boolean, sweep: boolean, to: Pt, step: number): Pt[] {
  if (rx === 0 || ry === 0 || (from.x === to.x && from.y === to.y)) return [to];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (rotation * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (from.x - to.x) / 2;
  const dy = (from.y - to.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  // Radii too small to span the endpoints are scaled up, as browsers do.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (k * rx * y1) / ry;
  const cy1 = (-k * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2;
  const cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = Math.max(2, Math.ceil((Math.abs(delta) * Math.max(rx, ry)) / step));
  const points: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = start + (delta * i) / n;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    points.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
  }
  points[points.length - 1] = to;
  return points;
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, step: number): Pt[] {
  const length = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y) + Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const n = Math.max(2, Math.ceil(length / step));
  const points: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    points.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return points;
}

const cache = new Map<string, Pt[][]>();

/**
 * The subpaths of an SVG path as polylines. A closed subpath (Z) does not
 * repeat its first point. `step` is the longest chord used on curves, in the
 * path's units (0.25 mm by default: finer than anything a part shows).
 */
export function flattenPath(d: string, step = 0.25): Pt[][] {
  const key = `${step}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const subpaths: Pt[][] = [];
  let current: Pt[] = [];
  let pos: Pt = { x: 0, y: 0 };
  let start: Pt = { x: 0, y: 0 };
  /** The last control point, for the smooth commands S and T. */
  let control: Pt | null = null;
  let previous = "";
  const flush = () => {
    if (current.length > 1) subpaths.push(current);
    current = [];
  };
  for (const match of d.matchAll(COMMAND)) {
    const letter = match[1];
    const upper = letter.toUpperCase();
    const relative = letter !== upper;
    const args = (match[2].match(NUMBER) ?? []).map(Number);
    const at = (x: number, y: number): Pt => (relative ? { x: pos.x + x, y: pos.y + y } : { x, y });
    if (upper === "Z") {
      // Closing returns to the subpath's start; drop a repeated first point.
      const first = current[0];
      const last = current[current.length - 1];
      if (first && last && current.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-9) current.pop();
      flush();
      pos = start;
      control = null;
      previous = upper;
      continue;
    }
    const size = upper === "H" || upper === "V" ? 1 : upper === "M" || upper === "L" || upper === "T" ? 2 : upper === "S" || upper === "Q" ? 4 : upper === "C" ? 6 : 7;
    for (let i = 0; i + size <= args.length; i += size) {
      const a = args.slice(i, i + size);
      // After the first pair, M continues as L.
      const op = upper === "M" && i > 0 ? "L" : upper;
      if (op === "M") {
        flush();
        pos = at(a[0], a[1]);
        start = pos;
        current.push(pos);
        control = null;
      } else if (op === "L") {
        pos = at(a[0], a[1]);
        current.push(pos);
        control = null;
      } else if (op === "H") {
        pos = { x: relative ? pos.x + a[0] : a[0], y: pos.y };
        current.push(pos);
        control = null;
      } else if (op === "V") {
        pos = { x: pos.x, y: relative ? pos.y + a[0] : a[0] };
        current.push(pos);
        control = null;
      } else if (op === "C" || op === "S") {
        const smooth = op === "S";
        const c1: Pt = smooth ? (control && (previous === "C" || previous === "S") ? { x: 2 * pos.x - control.x, y: 2 * pos.y - control.y } : pos) : at(a[0], a[1]);
        const c2 = smooth ? at(a[0], a[1]) : at(a[2], a[3]);
        const end = smooth ? at(a[2], a[3]) : at(a[4], a[5]);
        current.push(...cubic(pos, c1, c2, end, step));
        control = c2;
        pos = end;
      } else if (op === "Q" || op === "T") {
        const smooth = op === "T";
        const q: Pt = smooth ? (control && (previous === "Q" || previous === "T") ? { x: 2 * pos.x - control.x, y: 2 * pos.y - control.y } : pos) : at(a[0], a[1]);
        const end = smooth ? at(a[0], a[1]) : at(a[2], a[3]);
        // A quadratic is the cubic with both controls two thirds of the way to its one.
        const c1 = { x: pos.x + (2 / 3) * (q.x - pos.x), y: pos.y + (2 / 3) * (q.y - pos.y) };
        const c2 = { x: end.x + (2 / 3) * (q.x - end.x), y: end.y + (2 / 3) * (q.y - end.y) };
        current.push(...cubic(pos, c1, c2, end, step));
        control = q;
        pos = end;
      } else if (op === "A") {
        const end = at(a[5], a[6]);
        current.push(...arc(pos, a[0], a[1], a[2], a[3] !== 0, a[4] !== 0, end, step));
        control = null;
        pos = end;
      }
      previous = op;
    }
    previous = upper;
  }
  flush();
  if (cache.size > 500) cache.clear();
  cache.set(key, subpaths);
  return subpaths;
}

/** The box around a path. */
export function pathBounds(d: string): { x: number; y: number; w: number; h: number } {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const sub of flattenPath(d)) {
    for (const p of sub) {
      if (p.x < x1) x1 = p.x;
      if (p.y < y1) y1 = p.y;
      if (p.x > x2) x2 = p.x;
      if (p.y > y2) y2 = p.y;
    }
  }
  if (!Number.isFinite(x1)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Twice the signed area of a polygon: positive when it runs clockwise on screen (y down). */
export function signedArea(points: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

/* ----- Outlines people need often ------------------------------------------ */

const f = (n: number) => Math.round(n * 1000) / 1000;

/** A rectangle with rounded corners. */
export function roundedRect(x: number, y: number, w: number, h: number, r = 0): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (k === 0) return `M ${f(x)} ${f(y)} H ${f(x + w)} V ${f(y + h)} H ${f(x)} Z`;
  return `M ${f(x + k)} ${f(y)} H ${f(x + w - k)} A ${k} ${k} 0 0 1 ${f(x + w)} ${f(y + k)} V ${f(y + h - k)} A ${k} ${k} 0 0 1 ${f(x + w - k)} ${f(y + h)} H ${f(x + k)} A ${k} ${k} 0 0 1 ${f(x)} ${f(y + h - k)} V ${f(y + k)} A ${k} ${k} 0 0 1 ${f(x + k)} ${f(y)} Z`;
}

/** A full circle. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M ${f(cx - r)} ${f(cy)} A ${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A ${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
}

/** A flat ring: a circle with a round hole. */
export function ringPath(cx: number, cy: number, outer: number, inner: number): string {
  return `${circlePath(cx, cy, outer)} ${circlePath(cx, cy, inner)}`;
}

/** A closed polygon through points. */
export function polygonPath(points: Array<[number, number]>): string {
  return `${points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${f(x)} ${f(y)}`).join(" ")} Z`;
}
