/**
 * Kiungo's standard scrollbar, applied app-wide.
 *
 * Every element that scrolls (overflow auto/scroll, textareas) is found
 * automatically, including ones that appear later. Its native bar is hidden
 * and replaced by a slim overlay bar with small arrows that squashes against
 * the end when the user scrolls past the top/bottom (or left/right) and
 * springs back when they let go.
 *
 * Scrolling stays native; only the bar is drawn here. The overlay lives in
 * fixed-position elements on <body>, so no component has to change shape.
 *
 * Opt out for a subtree with the `data-native-scrollbar` attribute.
 */
import { ELASTIC, rubberBand, squash, thumbMetrics, wheelDeltaPx } from "./elastic-scroll";

export type Axis = "x" | "y";
type Edge = "start" | "end";

/** Cheap pre-filter; the computed style decides. */
export const CANDIDATE_SELECTOR =
  '[class*="overflow-auto"], [class*="overflow-scroll"], [class*="overflow-x-"], [class*="overflow-y-"], [style*="overflow"], textarea, .hhip-scroll';
export const OPT_OUT_ATTR = "data-native-scrollbar";
export const MANAGED_CLASS = "hhip-elastic-managed";

const BAR = 6;
const INSET = 1;
const END_GAP = 2;
const ARROW = 10;
const MIN_Z = 30;
const ARROW_STEP = 48;
const ARROW_BUMP = 70;

interface DragState {
  pointerId: number;
  start: number;
  startScroll: number;
}

interface Bar {
  axis: Axis;
  track: HTMLDivElement;
  rail: HTMLDivElement;
  thumb: HTMLDivElement;
  metrics: ReturnType<typeof thumbMetrics>;
  overscroll: number;
  edge: Edge;
  releaseTimer?: number;
  springTimer?: number;
  drag?: DragState;
}

interface Scroller {
  el: HTMLElement;
  bars: Record<Axis, Bar>;
  resize?: ResizeObserver;
  z: number;
}

function scrollsOn(style: CSSStyleDeclaration, axis: Axis, el?: Element): boolean {
  const value = axis === "y" ? style.overflowY : style.overflowX;
  if (value === "auto" || value === "scroll") return true;
  return el instanceof HTMLTextAreaElement && value !== "hidden";
}

export function isScrollContainer(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || el.closest(`[${OPT_OUT_ATTR}]`)) return false;
  const style = getComputedStyle(el);
  // Textareas scroll natively unless explicitly clipped.
  if (el instanceof HTMLTextAreaElement) return style.overflowY !== "hidden" || style.overflowX !== "hidden";
  return scrollsOn(style, "y") || scrollsOn(style, "x");
}

function pos(el: HTMLElement, axis: Axis) {
  return axis === "y"
    ? { scroll: el.scrollTop, client: el.clientHeight, size: el.scrollHeight }
    : { scroll: el.scrollLeft, client: el.clientWidth, size: el.scrollWidth };
}

function atEdge(el: HTMLElement, axis: Axis, edge: Edge): boolean {
  const { scroll, client, size } = pos(el, axis);
  return edge === "start" ? scroll <= 0 : scroll + client >= size - 1;
}

/** Highest z-index among positioned ancestors, so the bar sits above its own layer only. */
function stackingZ(el: HTMLElement): number {
  let z = 0;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position !== "static") {
      const value = Number.parseInt(style.zIndex, 10);
      if (Number.isFinite(value)) z = Math.max(z, value);
    }
  }
  return Math.max(MIN_Z, z + 1);
}

/** The part of the viewport where `el` is actually visible (ancestors may clip it). */
function visibleRect(el: HTMLElement): DOMRect | null {
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  for (let node: HTMLElement | null = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") {
      const r = node.getBoundingClientRect();
      left = Math.max(left, r.left);
      top = Math.max(top, r.top);
      right = Math.min(right, r.right);
      bottom = Math.min(bottom, r.bottom);
    }
  }
  const r = el.getBoundingClientRect();
  left = Math.max(left, r.left);
  top = Math.max(top, r.top);
  right = Math.min(right, r.right);
  bottom = Math.min(bottom, r.bottom);
  if (right - left < 1 || bottom - top < 1) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function startElasticScrollbars(root: Document = document): () => void {
  const scrollers = new Map<HTMLElement, Scroller>();
  let frame = 0;
  let scanTimer: number | undefined;

  // ---- drawing ----------------------------------------------------------

  const paintThumb = (bar: Bar) => {
    const stretch = prefersReducedMotion() ? 0 : rubberBand(bar.overscroll);
    const { scaleX, scaleY } = squash(stretch);
    const { size, offset } = bar.metrics;
    const thumb = bar.thumb;
    if (bar.axis === "y") {
      thumb.style.height = `${size}px`;
      thumb.style.width = "";
      thumb.style.transformOrigin = bar.edge === "end" ? "50% 100%" : "50% 0%";
      thumb.style.transform = `translateY(${offset}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
    } else {
      thumb.style.width = `${size}px`;
      thumb.style.height = "";
      thumb.style.transformOrigin = bar.edge === "end" ? "100% 50%" : "0% 50%";
      thumb.style.transform = `translateX(${offset}px) scale(${scaleY.toFixed(4)}, ${scaleX.toFixed(4)})`;
    }
    thumb.dataset.stretch = stretch.toFixed(3);
  };

  const layout = (scroller: Scroller) => {
    const { el } = scroller;
    const style = getComputedStyle(el);
    const visible = visibleRect(el);
    const rect = el.getBoundingClientRect();
    const innerLeft = rect.left + el.clientLeft;
    const innerTop = rect.top + el.clientTop;

    const wants: Record<Axis, boolean> = {
      y: scrollsOn(style, "y", el) && el.scrollHeight - el.clientHeight > 1,
      x: scrollsOn(style, "x", el) && el.scrollWidth - el.clientWidth > 1,
    };

    for (const axis of ["y", "x"] as const) {
      const bar = scroller.bars[axis];
      const show = wants[axis] && visible !== null;
      bar.track.dataset.scrollable = String(show);
      if (!show || !visible) continue;

      const other = axis === "y" ? wants.x : wants.y;
      const reserve = other ? BAR + END_GAP : 0;
      const trackLength = (axis === "y" ? el.clientHeight : el.clientWidth) - END_GAP * 2 - reserve;
      const box =
        axis === "y"
          ? { left: innerLeft + el.clientWidth - BAR - INSET, top: innerTop + END_GAP, width: BAR, height: trackLength }
          : { left: innerLeft + END_GAP, top: innerTop + el.clientHeight - BAR - INSET, width: trackLength, height: BAR };

      const t = bar.track.style;
      t.left = `${box.left}px`;
      t.top = `${box.top}px`;
      t.width = `${box.width}px`;
      t.height = `${box.height}px`;
      t.zIndex = String(scroller.z);
      const clip = {
        top: Math.max(0, visible.top - box.top),
        right: Math.max(0, box.left + box.width - visible.right),
        bottom: Math.max(0, box.top + box.height - visible.bottom),
        left: Math.max(0, visible.left - box.left),
      };
      t.clipPath = clip.top || clip.right || clip.bottom || clip.left
        ? `inset(${clip.top}px ${clip.right}px ${clip.bottom}px ${clip.left}px)`
        : "";

      const { scroll, client, size } = pos(el, axis);
      bar.metrics = thumbMetrics(client, size, scroll, Math.max(0, trackLength - ARROW * 2));
      paintThumb(bar);
    }
  };

  const layoutAll = () => {
    frame = 0;
    for (const [el, scroller] of scrollers) {
      if (!el.isConnected) {
        destroy(scroller);
        continue;
      }
      layout(scroller);
    }
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(layoutAll);
  };

  // ---- elastic stretch --------------------------------------------------

  const endSpring = (bar: Bar) => {
    delete bar.thumb.dataset.releasing;
  };

  const release = (bar: Bar) => {
    window.clearTimeout(bar.releaseTimer);
    if (bar.overscroll === 0) return;
    bar.overscroll = 0;
    bar.thumb.dataset.releasing = "";
    paintThumb(bar);
    window.clearTimeout(bar.springTimer);
    bar.springTimer = window.setTimeout(() => endSpring(bar), ELASTIC.springMs + 40);
  };

  const stretch = (bar: Bar, amount: number, edge: Edge) => {
    if (!bar.metrics.scrollable) return;
    if (edge !== bar.edge && bar.overscroll > 0) bar.overscroll = 0;
    bar.edge = edge;
    bar.overscroll = Math.max(0, bar.overscroll + amount);
    endSpring(bar);
    paintThumb(bar);
  };

  const releaseSoon = (bar: Bar, delay: number = ELASTIC.releaseDelay) => {
    window.clearTimeout(bar.releaseTimer);
    bar.releaseTimer = window.setTimeout(() => release(bar), delay);
  };

  /** Innermost managed scroller under `target` that can scroll on `axis`. */
  const scrollerFor = (target: EventTarget | null, axis: Axis): Scroller | null => {
    for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
      if (node.hasAttribute(OPT_OUT_ATTR)) return null;
      const scroller = scrollers.get(node as HTMLElement);
      if (scroller?.bars[axis].metrics.scrollable) return scroller;
    }
    return null;
  };

  // ---- inputs -----------------------------------------------------------

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    let dx = event.deltaX;
    let dy = wheelDeltaPx(event, window.innerHeight);
    if (event.shiftKey && dx === 0) {
      dx = dy;
      dy = 0;
    }
    const axis: Axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
    const delta = axis === "y" ? dy : dx;
    if (delta === 0) return;
    const scroller = scrollerFor(event.target, axis);
    if (!scroller) return;
    const bar = scroller.bars[axis];
    const edge: Edge = delta < 0 ? "start" : "end";
    if (atEdge(scroller.el, axis, edge)) {
      stretch(bar, Math.abs(delta), edge);
      releaseSoon(bar);
    } else if (bar.overscroll > 0) {
      release(bar);
    }
  };

  let touch: { x: number; y: number; target: EventTarget | null } | null = null;
  const touched = new Set<Bar>();
  const onTouchStart = (event: TouchEvent) => {
    const t = event.touches[0];
    touch = t ? { x: t.clientX, y: t.clientY, target: event.target } : null;
  };
  const onTouchMove = (event: TouchEvent) => {
    const t = event.touches[0];
    if (!touch || !t) return;
    const dx = touch.x - t.clientX;
    const dy = touch.y - t.clientY;
    touch.x = t.clientX;
    touch.y = t.clientY;
    const axis: Axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
    const delta = axis === "y" ? dy : dx;
    const scroller = scrollerFor(touch.target, axis);
    if (!scroller || delta === 0) return;
    const bar = scroller.bars[axis];
    const edge: Edge = delta < 0 ? "start" : "end";
    if (atEdge(scroller.el, axis, edge)) {
      stretch(bar, Math.abs(delta), edge);
      touched.add(bar);
    } else if (bar.overscroll > 0) {
      stretch(bar, -Math.abs(delta), bar.edge);
    }
  };
  const onTouchEnd = () => {
    touch = null;
    for (const bar of touched) release(bar);
    touched.clear();
  };

  // ---- building bars ----------------------------------------------------

  const makeBar = (scroller: Scroller, axis: Axis): Bar => {
    const track = document.createElement("div");
    track.className = "hhip-elastic-track";
    track.dataset.axis = axis;
    track.dataset.scrollable = "false";
    track.setAttribute("aria-hidden", "true");

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.tabIndex = -1;
    startBtn.className = "hhip-elastic-arrow";
    startBtn.dataset.direction = axis === "y" ? "up" : "left";

    const rail = document.createElement("div");
    rail.className = "hhip-elastic-rail";
    const thumb = document.createElement("div");
    thumb.className = "hhip-elastic-thumb";
    rail.append(thumb);

    const endBtn = document.createElement("button");
    endBtn.type = "button";
    endBtn.tabIndex = -1;
    endBtn.className = "hhip-elastic-arrow";
    endBtn.dataset.direction = axis === "y" ? "down" : "right";

    track.append(startBtn, rail, endBtn);
    document.body.append(track);

    const bar: Bar = { axis, track, rail, thumb, metrics: thumbMetrics(0, 0, 0, 0), overscroll: 0, edge: "start" };
    const el = scroller.el;
    const scrollTo = (value: number) => {
      if (axis === "y") el.scrollTop = value;
      else el.scrollLeft = value;
    };

    thumb.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      bar.drag = {
        pointerId: event.pointerId,
        start: axis === "y" ? event.clientY : event.clientX,
        startScroll: pos(el, axis).scroll,
      };
      thumb.dataset.dragging = "";
    });
    thumb.addEventListener("pointermove", (event) => {
      const drag = bar.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { client, size } = pos(el, axis);
      const range = size - client;
      const pointer = axis === "y" ? event.clientY : event.clientX;
      const target = drag.startScroll + (pointer - drag.start) * bar.metrics.ratio;
      scrollTo(target);
      const ratio = bar.metrics.ratio || 1;
      if (target < 0) {
        bar.edge = "start";
        bar.overscroll = (-target / ratio) * 2;
      } else if (target > range) {
        bar.edge = "end";
        bar.overscroll = ((target - range) / ratio) * 2;
      } else {
        bar.overscroll = 0;
      }
      endSpring(bar);
      paintThumb(bar);
    });
    const endDrag = (event: PointerEvent) => {
      if (!bar.drag || event.pointerId !== bar.drag.pointerId) return;
      bar.drag = undefined;
      delete thumb.dataset.dragging;
      release(bar);
    };
    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);

    rail.addEventListener("pointerdown", (event) => {
      if (event.target !== rail || event.button !== 0) return;
      const r = rail.getBoundingClientRect();
      const at = axis === "y" ? event.clientY - r.top : event.clientX - r.left;
      const direction = at < bar.metrics.offset ? -1 : 1;
      const page = pos(el, axis).client * 0.9 * direction;
      el.scrollBy(axis === "y" ? { top: page, behavior: "smooth" } : { left: page, behavior: "smooth" });
    });

    const arrow = (direction: -1 | 1) => (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const edge: Edge = direction < 0 ? "start" : "end";
      if (atEdge(el, axis, edge)) {
        stretch(bar, ARROW_BUMP, edge);
        releaseSoon(bar, 110);
      } else {
        const step = direction * ARROW_STEP;
        el.scrollBy(axis === "y" ? { top: step, behavior: "smooth" } : { left: step, behavior: "smooth" });
      }
    };
    startBtn.addEventListener("pointerdown", arrow(-1));
    endBtn.addEventListener("pointerdown", arrow(1));
    return bar;
  };

  const manage = (el: HTMLElement) => {
    const scroller = { el, z: stackingZ(el) } as Scroller;
    scroller.bars = { y: makeBar(scroller, "y"), x: makeBar(scroller, "x") };
    el.classList.add(MANAGED_CLASS);
    if (typeof ResizeObserver === "function") {
      scroller.resize = new ResizeObserver(schedule);
      scroller.resize.observe(el);
      if (el.firstElementChild) scroller.resize.observe(el.firstElementChild);
    }
    scrollers.set(el, scroller);
  };

  function destroy(scroller: Scroller) {
    for (const bar of Object.values(scroller.bars)) {
      window.clearTimeout(bar.releaseTimer);
      window.clearTimeout(bar.springTimer);
      bar.track.remove();
    }
    scroller.resize?.disconnect();
    scroller.el.classList.remove(MANAGED_CLASS);
    scrollers.delete(scroller.el);
  }

  // Streamed pages arrive as server HTML before React hydrates them. Tagging
  // those elements early would make React's hydration see a class it didn't
  // render, so wait until React has claimed an element, and look again soon.
  const reactApp = () => Object.keys(root).some((key) => key.startsWith("__reactContainer"));
  const hydrated = (el: Element) => !reactApp() || Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  let retryTimer: number | undefined;

  const scan = () => {
    scanTimer = undefined;
    for (const [el, scroller] of scrollers) {
      if (!el.isConnected || !isScrollContainer(el)) destroy(scroller);
      else scroller.z = stackingZ(el);
    }
    let waiting = false;
    for (const node of root.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (scrollers.has(node as HTMLElement) || !isScrollContainer(node)) continue;
      if (!hydrated(node)) {
        waiting = true;
        continue;
      }
      manage(node);
    }
    if (waiting && retryTimer === undefined) {
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        scan();
      }, 250);
    }
    schedule();
  };

  const scheduleScan = () => {
    if (scanTimer === undefined) scanTimer = window.setTimeout(scan, 60);
  };

  const ours = (node: Node) => node instanceof Element && node.classList.contains("hhip-elastic-track");
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target instanceof Element && record.target.closest(".hhip-elastic-track")) continue;
      if (record.type === "childList") {
        const nodes = [...record.addedNodes, ...record.removedNodes];
        if (nodes.length > 0 && nodes.every(ours)) continue;
      }
      scheduleScan();
      schedule();
      return;
    }
  });

  root.documentElement.classList.add("hhip-elastic-ready");
  mutations.observe(root.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
  root.addEventListener("scroll", schedule, { capture: true, passive: true });
  root.addEventListener("wheel", onWheel, { capture: true, passive: true });
  root.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  root.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
  root.addEventListener("touchend", onTouchEnd, { capture: true });
  root.addEventListener("touchcancel", onTouchEnd, { capture: true });
  window.addEventListener("resize", schedule);
  scan();

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(scanTimer);
    window.clearTimeout(retryTimer);
    mutations.disconnect();
    root.removeEventListener("scroll", schedule, { capture: true });
    root.removeEventListener("wheel", onWheel, { capture: true });
    root.removeEventListener("touchstart", onTouchStart, { capture: true });
    root.removeEventListener("touchmove", onTouchMove, { capture: true });
    root.removeEventListener("touchend", onTouchEnd, { capture: true });
    root.removeEventListener("touchcancel", onTouchEnd, { capture: true });
    window.removeEventListener("resize", schedule);
    for (const scroller of [...scrollers.values()]) destroy(scroller);
    root.documentElement.classList.remove("hhip-elastic-ready");
  };
}
