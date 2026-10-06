/**
 * Maths for the elastic scrollbar: how far the thumb squashes when the user
 * keeps scrolling past either end, and where it sits the rest of the time.
 */

export const ELASTIC = {
  /** Overscroll distance (px) at which the squash reaches half its maximum. */
  resistance: 140,
  /** Largest fraction of its length the thumb can lose. */
  maxSquash: 0.55,
  /** How much wider the thumb gets at full squash, so it reads as compressed. */
  maxBulge: 0.45,
  /** Shortest thumb, in px. */
  minThumb: 24,
  /** Quiet time after the last wheel event that counts as letting go (ms). */
  releaseDelay: 140,
  /** Length of the spring back to rest (ms); keep in step with the CSS. */
  springMs: 520,
} as const;

/**
 * Rubber-band curve: 0 at rest, approaching 1 the further the user pulls,
 * with each extra pixel adding less than the one before.
 */
export function rubberBand(distance: number, resistance: number = ELASTIC.resistance): number {
  if (!(distance > 0) || !(resistance > 0)) return 0;
  return 1 - 1 / (distance / resistance + 1);
}

/** Thumb scale for a given stretch (0..1): shorter and slightly wider. */
export function squash(stretch: number): { scaleX: number; scaleY: number } {
  const s = Math.min(1, Math.max(0, stretch));
  return { scaleX: 1 + ELASTIC.maxBulge * s, scaleY: 1 - ELASTIC.maxSquash * s };
}

export interface ThumbMetrics {
  scrollable: boolean;
  /** Thumb length in px. */
  size: number;
  /** Thumb offset from the top of the rail in px. */
  offset: number;
  /** Scroll pixels per pixel of thumb travel, for dragging. */
  ratio: number;
}

export function thumbMetrics(
  clientHeight: number,
  scrollHeight: number,
  scrollTop: number,
  railHeight: number,
  minThumb: number = ELASTIC.minThumb,
): ThumbMetrics {
  const range = scrollHeight - clientHeight;
  if (range <= 1 || clientHeight <= 0 || railHeight <= 0) {
    return { scrollable: false, size: 0, offset: 0, ratio: 0 };
  }
  const size = Math.min(railHeight, Math.max(minThumb, (clientHeight / scrollHeight) * railHeight));
  const travel = Math.max(0, railHeight - size);
  const progress = Math.min(1, Math.max(0, scrollTop / range));
  return { scrollable: true, size, offset: progress * travel, ratio: travel > 0 ? range / travel : 0 };
}

/** Wheel deltas in px whatever the device reports (pixels, lines or pages). */
export function wheelDeltaPx(event: Pick<WheelEvent, "deltaY" | "deltaMode">, pageHeight: number): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * pageHeight;
  return event.deltaY;
}
