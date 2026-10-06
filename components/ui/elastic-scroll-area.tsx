"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ELASTIC, rubberBand, squash, thumbMetrics, wheelDeltaPx } from "@/lib/ui/elastic-scroll";
import { cn } from "@/lib/utils";

type Edge = "top" | "bottom";

const ARROW_STEP = 48;
const ARROW_BUMP = 70;

/**
 * A vertical scroll area with HHIP's slim scrollbar drawn in the page rather
 * than by the browser, so it can react to overscroll: pushing past the top
 * or bottom squashes the thumb against that end with rising resistance, and
 * letting go springs it back to rest.
 *
 * Scrolling itself stays native (wheel, touch, keyboard, find-in-page);
 * only the bar is custom. Positions are written straight to the DOM so a
 * scroll never re-renders React.
 */
export function ElasticScrollArea({
  children,
  className,
  viewportClassName,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    const up = upRef.current;
    const down = downRef.current;
    if (!viewport || !track || !rail || !thumb || !up || !down) return;

    const motion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let metrics = thumbMetrics(0, 0, 0, 0);
    let overscroll = 0;
    let edge: Edge = "top";
    let releaseTimer: number | undefined;
    let springTimer: number | undefined;
    let frame = 0;

    const atTop = () => viewport.scrollTop <= 0;
    const atBottom = () => viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;

    const paint = () => {
      const stretch = motion?.matches ? 0 : rubberBand(overscroll);
      const { scaleX, scaleY } = squash(stretch);
      thumb.style.height = `${metrics.size}px`;
      thumb.style.transformOrigin = edge === "bottom" ? "50% 100%" : "50% 0%";
      thumb.style.transform = `translateY(${metrics.offset}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
      thumb.dataset.stretch = stretch.toFixed(3);
    };

    const measure = () => {
      frame = 0;
      metrics = thumbMetrics(viewport.clientHeight, viewport.scrollHeight, viewport.scrollTop, rail.clientHeight);
      track.dataset.scrollable = String(metrics.scrollable);
      paint();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const endSpring = () => {
      delete thumb.dataset.releasing;
    };

    /** Let go: spring back to rest with a slight overshoot (see CSS). */
    const release = () => {
      window.clearTimeout(releaseTimer);
      if (overscroll === 0) return;
      overscroll = 0;
      thumb.dataset.releasing = "";
      paint();
      window.clearTimeout(springTimer);
      springTimer = window.setTimeout(endSpring, ELASTIC.springMs + 40);
    };

    const stretchBy = (amount: number, towards: Edge) => {
      if (!metrics.scrollable) return;
      if (towards !== edge && overscroll > 0) overscroll = 0;
      edge = towards;
      overscroll = Math.max(0, overscroll + amount);
      endSpring();
      paint();
    };

    const onScroll = () => {
      // Moving away from an end cancels any stretch at once.
      if (overscroll > 0 && !atTop() && !atBottom()) {
        overscroll = 0;
        endSpring();
      }
      schedule();
    };

    const onWheel = (event: WheelEvent) => {
      if (!metrics.scrollable || event.ctrlKey) return;
      const dy = wheelDeltaPx(event, viewport.clientHeight);
      if (dy === 0) return;
      const pushingTop = dy < 0 && atTop();
      const pushingBottom = dy > 0 && atBottom();
      if (pushingTop || pushingBottom) {
        stretchBy(Math.abs(dy), pushingTop ? "top" : "bottom");
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(release, ELASTIC.releaseDelay);
      } else if (overscroll > 0) {
        release();
      }
    };

    let touchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      const dy = touchY - y; // > 0 means scrolling towards the bottom
      touchY = y;
      if (dy < 0 && atTop()) stretchBy(-dy, "top");
      else if (dy > 0 && atBottom()) stretchBy(dy, "bottom");
      else if (overscroll > 0) stretchBy(-Math.abs(dy), edge); // easing off
    };
    const onTouchEnd = () => {
      touchY = null;
      release();
    };

    // Dragging the thumb; dragging past an end stretches it too.
    let drag: { pointerId: number; startY: number; startTop: number } | null = null;
    const onThumbDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      drag = { pointerId: event.pointerId, startY: event.clientY, startTop: viewport.scrollTop };
      thumb.dataset.dragging = "";
    };
    const onThumbMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const range = viewport.scrollHeight - viewport.clientHeight;
      const target = drag.startTop + (event.clientY - drag.startY) * metrics.ratio;
      viewport.scrollTop = target;
      const ratio = metrics.ratio || 1;
      if (target < 0) {
        edge = "top";
        overscroll = (-target / ratio) * 2;
      } else if (target > range) {
        edge = "bottom";
        overscroll = ((target - range) / ratio) * 2;
      } else {
        overscroll = 0;
      }
      endSpring();
      paint();
    };
    const onThumbUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      delete thumb.dataset.dragging;
      release();
    };

    // Clicking the rail pages towards the click.
    const onRailDown = (event: PointerEvent) => {
      if (event.target !== rail || event.button !== 0) return;
      const rect = rail.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const direction = clickY < metrics.offset ? -1 : 1;
      viewport.scrollBy({ top: direction * viewport.clientHeight * 0.9, behavior: "smooth" });
    };

    // Arrows step; at an end they give a short elastic bump instead.
    const arrow = (direction: -1 | 1) => (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const blocked = direction < 0 ? atTop() : atBottom();
      if (blocked) {
        stretchBy(ARROW_BUMP, direction < 0 ? "top" : "bottom");
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(release, 110);
      } else {
        viewport.scrollBy({ top: direction * ARROW_STEP, behavior: "smooth" });
      }
    };
    const onUp = arrow(-1);
    const onDown = arrow(1);

    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    resize?.observe(viewport);
    resize?.observe(rail);
    if (viewport.firstElementChild) resize?.observe(viewport.firstElementChild);
    window.addEventListener("resize", schedule);

    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    thumb.addEventListener("pointerdown", onThumbDown);
    thumb.addEventListener("pointermove", onThumbMove);
    thumb.addEventListener("pointerup", onThumbUp);
    thumb.addEventListener("pointercancel", onThumbUp);
    rail.addEventListener("pointerdown", onRailDown);
    up.addEventListener("pointerdown", onUp);
    down.addEventListener("pointerdown", onDown);
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(releaseTimer);
      window.clearTimeout(springTimer);
      resize?.disconnect();
      window.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      thumb.removeEventListener("pointerdown", onThumbDown);
      thumb.removeEventListener("pointermove", onThumbMove);
      thumb.removeEventListener("pointerup", onThumbUp);
      thumb.removeEventListener("pointercancel", onThumbUp);
      rail.removeEventListener("pointerdown", onRailDown);
      up.removeEventListener("pointerdown", onUp);
      down.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div className={cn("relative min-h-0", className)}>
      <div ref={viewportRef} className={cn("hhip-scroll-viewport h-full overflow-y-auto", viewportClassName)}>
        {children}
      </div>
      {/* Pointer-only control: the viewport itself scrolls with keyboard and assistive tech. */}
      <div ref={trackRef} className="hhip-elastic-track" data-scrollable="false" aria-hidden>
        <button ref={upRef} type="button" tabIndex={-1} className="hhip-elastic-arrow" data-direction="up" />
        <div ref={railRef} className="hhip-elastic-rail">
          <div ref={thumbRef} className="hhip-elastic-thumb" data-testid="elastic-thumb" />
        </div>
        <button ref={downRef} type="button" tabIndex={-1} className="hhip-elastic-arrow" data-direction="down" />
      </div>
    </div>
  );
}
