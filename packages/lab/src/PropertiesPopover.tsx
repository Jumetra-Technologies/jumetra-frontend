"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { placePopover } from "@kiungo/core/lab/selection";
import { cn } from "@kiungo/ui/cn";

const WIDTH = 320;

/**
 * The properties popover (B3): non-modal, beside what it describes. It sits
 * to the right of its anchor and flips left near the edge, follows the part
 * while the canvas pans or the part moves, and becomes a bottom sheet on
 * narrow screens. It never touches the simulation: knobs in it work while
 * the circuit runs. Esc closes it (unless a field inside wants Esc for
 * itself, such as a value being typed).
 */
export function PropertiesPopover({
  anchor,
  bounds,
  sheet,
  label,
  onClose,
  children,
  testId = "properties-popover",
}: {
  /** The anchor's box on screen, read again every frame while open (parts move and the canvas pans). */
  anchor: () => DOMRect | { left: number; top: number; right: number; bottom: number } | null;
  /** What the popover must stay inside: the canvas. */
  bounds: RefObject<HTMLElement | null>;
  /** A bottom sheet instead (phones). */
  sheet: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; side: "right" | "left"; maxHeight: number } | null>(null);
  const anchorRef = useRef(anchor);
  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  // Follow the anchor. One rect read a frame while open; state changes only when it moves.
  useLayoutEffect(() => {
    if (sheet) return;
    let frame = 0;
    const measure = () => {
      const a = anchorRef.current();
      const b = bounds.current?.getBoundingClientRect();
      const el = box.current;
      if (a && b && el) {
        const next = { ...placePopover(a, { width: el.offsetWidth || WIDTH, height: el.offsetHeight || 0 }, b), maxHeight: Math.max(240, Math.round(b.height - 16)) };
        setAt((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.side === next.side && prev.maxHeight === next.maxHeight ? prev : next));
      }
      if (typeof window.requestAnimationFrame === "function") frame = window.requestAnimationFrame(measure);
    };
    measure();
    return () => {
      if (frame && typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frame);
    };
  }, [sheet, bounds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      data-testid={testId}
      data-side={sheet ? "sheet" : at?.side}
      className={cn(
        "hhip-scroll z-40 overflow-y-auto overflow-x-hidden border border-border bg-surface text-foreground shadow-[var(--shadow-md)]",
        sheet ? "fixed inset-x-0 bottom-0 max-h-[70vh] rounded-t-[16px] border-b-0" : "fixed w-[320px] rounded-[14px] hhip-menu-pop",
      )}
      style={sheet ? undefined : { left: at?.left ?? -9999, top: at?.top ?? -9999, maxHeight: at ? Math.min(576, at.maxHeight) : 576 }}
    >
      {sheet ? <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" /> : null}
      {children}
    </div>
  );
}
