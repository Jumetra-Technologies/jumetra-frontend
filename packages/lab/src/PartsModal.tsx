"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { FolderKanban, Plus, Search, Sparkles, Wand2, X } from "lucide-react";
import { Dialog } from "@kiungo/ui/dialog";
import { cn } from "@kiungo/ui/cn";
import { PART_GROUPS, getPartsByGroup } from "@kiungo/core/parts";
import type { PartModel } from "@kiungo/core/parts/types";
import { fitFor, suggest, type ProjectContext, type Suggestion } from "@kiungo/core/lab/suggest";
import type { LabNode, LabView } from "@kiungo/core/lab/types";
import { placeAt } from "@kiungo/core/lab/autowire";
import { nodeLayout } from "@kiungo/core/lab/layout";
import { PartThumb } from "./views/PartThumb";

/** Starter builds offered under the library. */
export const TEMPLATES: Array<{ id: string; title: string; blurb: string; board: string; parts: string[] }> = [
  { id: "blink", title: "Blink an LED", blurb: "Uno + LED on D13", board: "arduino-uno", parts: ["led"] },
  { id: "climate", title: "Temperature display", blurb: "ESP32 + DHT22 + OLED", board: "esp32", parts: ["dht22", "oled-ssd1306"] },
  { id: "alarm", title: "Motion alarm", blurb: "Uno + PIR + buzzer", board: "arduino-uno", parts: ["pir", "buzzer"] },
  { id: "radar", title: "Distance radar", blurb: "Uno + HC-SR04 + servo", board: "arduino-uno", parts: ["hc-sr04", "servo"] },
];

/** Parts added in one opening of the modal: where the first went, how many, and which. */
export interface Cascade {
  origin: { x: number; y: number };
  n: number;
  added: string[];
}

/**
 * Where the next part from the modal goes (B2): the first one centered on
 * the canvas's viewport, each next one added before it closes 24 px further
 * down and right. Parts that were on the canvas before are never covered: the
 * spot moves on along the same diagonal until it's free.
 */
export function placeFromModal(cascade: Cascade | null, input: { partId: string; center: { x: number; y: number }; nodes: LabNode[]; view: LabView }): { x: number; y: number } {
  const before = input.nodes.filter((n) => !cascade?.added.includes(n.id));
  if (!cascade) {
    const { w, h } = nodeLayout(input.partId, input.view);
    return placeAt(input.partId, before, { x: input.center.x - w / 2, y: input.center.y - h / 2 });
  }
  return placeAt(input.partId, before, { x: cascade.origin.x + 24 * cascade.n, y: cascade.origin.y + 24 * cascade.n });
}

export const nextCascade = (cascade: Cascade | null, at: { x: number; y: number }, nodeId: string | null): Cascade => ({
  origin: cascade?.origin ?? at,
  n: (cascade?.n ?? 0) + 1,
  added: [...(cascade?.added ?? []), ...(nodeId ? [nodeId] : [])],
});

/** How many parts the library has: counted from the catalog, never written down. */
export function catalogCount(): number {
  return getPartsByGroup().reduce((n, g) => n + g.parts.length, 0);
}

/** What the list says above its results: searching, no match, a count, or the library. */
export function resultStatus({ query, settledQuery, count, didYouMean, group }: { query: string; settledQuery: string; count: number; didYouMean: boolean; group: string | null }): string {
  if (query.trim() && query !== settledQuery) return "Searching…";
  if (query.trim()) {
    if (!count) return `No parts match “${query.trim()}”`;
    return didYouMean ? "No exact match. Did you mean:" : `${count} result${count === 1 ? "" : "s"}`;
  }
  if (!count) return "No parts in this group yet";
  const title = group ? PART_GROUPS.find((g) => g.id === group)?.title : null;
  return title ? `${title} · ${count}` : `All parts · ${count}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Add a part; `keepOpen` when the person held Shift to add several. */
  onAdd: (partId: string, keepOpen: boolean) => void;
  nodes: LabNode[];
  project: (ProjectContext & { id: string }) | null;
  autowire: boolean;
  onAutowire: (value: boolean) => void;
  onTemplate: (id: string) => void;
  /** Omitted: "Link a project" isn't offered. */
  onLinkProject?: () => void;
  /** Where focus goes when it closes: the + button. */
  returnFocus?: () => HTMLElement | null | undefined;
}

/**
 * "Add a part": the whole library in a modal, opened by + Add (or "/").
 * Search, filter by group, then click a part (or Enter) to add it at the
 * center of the canvas; Shift-click adds and keeps the modal open for more.
 * The canvas is covered while it's open, so there's no dragging from here.
 */
export function PartsModal({ open, onClose, onAdd, nodes, project, autowire, onAutowire, onTemplate, onLinkProject, returnFocus }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const settledQuery = useDeferredValue(query);
  const groups = useMemo(() => getPartsByGroup(), []);
  const total = useMemo(() => groups.reduce((n, g) => n + g.parts.length, 0), [groups]);

  const results = useMemo((): Suggestion[] => {
    const inGroup = (p: PartModel) => !group || p.group === group;
    if (settledQuery.trim()) return suggest(settledQuery, nodes, project, 200).items.filter((s) => inGroup(s.part));
    return groups.flatMap((g) => g.parts).filter(inGroup).map((part) => ({ part, reason: part.summary.split(". ")[0], source: "search" as const, fit: fitFor(part.id, nodes) }));
  }, [settledQuery, group, groups, nodes, project]);
  const didYouMean = useMemo(() => (settledQuery.trim() ? suggest(settledQuery, nodes, project, 1).didYouMean : false), [settledQuery, nodes, project]);
  const suggested = useMemo(() => (!settledQuery.trim() && !group ? suggest("", nodes, project, 4).items : []), [settledQuery, group, nodes, project]);
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  const status = resultStatus({ query, settledQuery, count: results.length, didYouMean, group });

  const close = () => {
    onClose();
    setQuery("");
    setGroup(null);
    setActive(0);
  };
  const add = (partId: string, keepOpen: boolean) => {
    onAdd(partId, keepOpen);
    if (!keepOpen) close();
  };
  const move = (delta: number) => {
    if (!results.length) return;
    const next = (activeIndex + delta + results.length) % results.length;
    setActive(next);
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView?.({ block: "nearest" });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add a part"
      returnFocus={returnFocus}
      testId="parts-modal"
      className="w-[min(920px,calc(100vw-32px))]"
      headerExtra={
        <span className="mt-1 shrink-0 rounded-full bg-muted-bg px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted" data-testid="parts-count">
          {total} parts
        </span>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <button type="button" role="switch" aria-checked={autowire} onClick={() => onAutowire(!autowire)} className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors", autowire ? "border-primary bg-primary" : "border-border bg-muted-bg")}>
              <span className={cn("size-3.5 rounded-full bg-white shadow-sm transition-transform", autowire ? "translate-x-[18px]" : "translate-x-0.5")} />
            </button>
            <span className="inline-flex items-center gap-1">
              <Wand2 className="size-3.5 text-muted" aria-hidden /> Auto-wire to board
            </span>
          </label>
          <span className="text-muted">Click or Enter adds and closes. Shift-click adds and keeps this open.</span>
          {project ? (
            <span className="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-full bg-accent px-2 py-0.5 font-medium text-primary" title={`Suggestions use “${project.name}”`}>
              <FolderKanban className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{project.name}</span>
            </span>
          ) : onLinkProject ? (
            <button type="button" onClick={onLinkProject} className="font-medium text-primary hover:underline">
              Link a project
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                move(-1);
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                add(results[activeIndex].part.id, e.shiftKey);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="parts-modal-list"
            aria-activedescendant={results[activeIndex] ? `parts-modal-${results[activeIndex].part.id}` : undefined}
            aria-label="Search parts"
            placeholder="Search parts: led, temperature, i2c…"
            className="h-11 w-full rounded-[12px] border border-border bg-canvas pl-9 pr-10 text-sm outline-none placeholder:text-muted focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
            data-testid="lab-search"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-muted-bg hover:text-foreground">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div role="group" aria-label="Filter by group" className="flex flex-wrap gap-1.5">
          {[{ id: null as string | null, title: "All" }, ...groups.map((g) => ({ id: g.group.id as string | null, title: g.group.title }))].map((g) => (
            <button
              key={g.id ?? "all"}
              type="button"
              aria-pressed={group === g.id}
              onClick={() => {
                setGroup(g.id);
                setActive(0);
              }}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", group === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:text-foreground")}
            >
              {g.title}
            </button>
          ))}
        </div>

        {suggested.length ? (
          <section aria-label="Suggested">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> Suggested for {project ? "this project" : nodes.length ? "this build" : "a first build"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((s) => (
                <button key={s.part.id} type="button" onClick={(e) => add(s.part.id, e.shiftKey)} title={s.reason} className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary">
                  <Plus className="size-3.5 text-primary" aria-hidden /> {s.part.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs font-medium text-muted" role="status" aria-live="polite" data-testid="parts-status">
          {status}
        </p>
        {results.length ? (
          <ul ref={listRef} id="parts-modal-list" role="listbox" aria-label={query ? "Search results" : "Parts"} className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="parts-grid">
            {results.map((item, i) => (
              <li
                key={item.part.id}
                id={`parts-modal-${item.part.id}`}
                role="option"
                aria-selected={i === activeIndex}
                data-index={i}
                data-part={item.part.id}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => add(item.part.id, e.shiftKey)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-[12px] border px-2.5 py-2 transition-colors", i === activeIndex ? "border-primary bg-accent" : "border-border hover:bg-muted-bg")}
                data-testid="parts-modal-item"
              >
                <PartThumb model={item.part} className="size-12 shrink-0 p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-5 text-foreground">{item.part.name}</p>
                  <p className="line-clamp-2 text-[11.5px] leading-4 text-muted">{item.reason}</p>
                  {item.fit ? <p className={cn("mt-1 line-clamp-2 max-w-full rounded-md px-1.5 py-px text-[10.5px] font-medium leading-snug", item.fit.tone === "ok" ? "bg-success/10 text-success" : "bg-warning/15 text-warning")}>{item.fit.text}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted" data-testid="parts-empty">
            {query.trim() ? "Try another word: a part's name (DHT22), what it does (temperature) or how it connects (I2C)." : "Pick another group to see its parts."}
          </div>
        )}

        {!query.trim() && !group ? (
          <section aria-label="Starter builds" className="border-t border-border pt-3">
            <p className="mb-1.5 text-xs font-medium text-muted">Or start from a build</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onTemplate(t.id);
                    close();
                  }}
                  className="rounded-[10px] border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                  data-testid={`template-${t.id}`}
                >
                  <span className="block text-[12px] font-semibold text-foreground">{t.title}</span>
                  <span className="block text-[10.5px] leading-4 text-muted">{t.blurb}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Dialog>
  );
}
