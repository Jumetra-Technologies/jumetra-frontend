"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open modals, bottom to top: only the top one answers Escape and traps Tab. */
const stack: symbol[] = [];

/**
 * A modal over the page: dims what's behind it, keeps focus inside, closes
 * on Escape or a click outside, and gives focus back to whatever opened it.
 * Modals stack, so the profile can open over Settings and Escape closes
 * only the top one.
 */
export function ModalShell({
  open,
  onClose,
  labelledBy,
  describedBy,
  className,
  children,
  initialFocus,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  children: ReactNode;
  /** CSS selector inside the panel to focus first; defaults to the first focusable. */
  initialFocus?: string;
  testId?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    stack.push(id);
    // Later modals sit above earlier ones.
    if (layerRef.current) layerRef.current.style.zIndex = String(50 + stack.length * 2);
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || focusables()[0] || panel;
    first?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        firstItem.focus();
      } else if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (previouslyFocused?.isConnected) previouslyFocused.focus?.();
    };
  }, [open, initialFocus]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={layerRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="hhip-dialog-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => onCloseRef.current()} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        data-testid={testId}
        className={cn(
          "hhip-dialog-panel relative flex max-h-[min(90svh,760px)] w-full flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-[var(--shadow-md)] outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
