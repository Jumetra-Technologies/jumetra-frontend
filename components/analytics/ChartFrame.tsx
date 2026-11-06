"use client";

import { useId, useState, type ReactNode } from "react";
import { Table2, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Every chart on the page: a heading, a one-sentence summary that says what
 * the chart shows (its text alternative), and a toggle to read the same
 * numbers as a table.
 */
export function ChartFrame({
  title,
  summary,
  table,
  actions,
  children,
  className,
  id,
}: {
  title: string;
  summary: ReactNode;
  /** Column headings and rows for the table view. Omit when the chart is already a list. */
  table?: { columns: string[]; rows: Array<Array<string | number>> };
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const summaryId = useId();
  return (
    <figure role="group" aria-labelledby={titleId} aria-describedby={summaryId} className={cn("min-w-0", className)} id={id}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="text-[15px] font-semibold text-foreground">
            {title}
          </h3>
          <figcaption id={summaryId} className="mt-1 max-w-prose text-sm leading-5 text-muted">
            {summary}
          </figcaption>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && table.rows.length > 0 ? (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-muted-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {asTable ? <BarChart3 className="size-3.5" aria-hidden /> : <Table2 className="size-3.5" aria-hidden />}
              {asTable ? "Show as chart" : "Show as table"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        {asTable && table ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={cn("py-2 pr-4 font-medium", i > 0 && "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="border-b border-border/60 last:border-0">
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="py-2 pr-4 font-normal text-foreground">
                          {cell}
                        </th>
                      ) : (
                        <td key={i} className="py-2 pr-4 text-right tabular-nums text-foreground">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}

/** A small trend line. Decorative: the number beside it says the same thing. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <div className={cn("h-6", className)} aria-hidden />;
  const w = 96;
  const h = 24;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const points = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-6 w-24 overflow-visible", className)} aria-hidden focusable="false">
      <polyline points={`0,${h} ${line} ${w},${h}`} fill="color-mix(in srgb, var(--analytics-teal) 12%, transparent)" stroke="none" />
      <polyline points={line} fill="none" stroke="var(--analytics-teal)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill="var(--analytics-teal)" />
    </svg>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Shown after the bar, e.g. "4 sessions". */
  valueLabel: string;
  /** A small note under the label, e.g. "You've used it". */
  note?: ReactNode;
}

/**
 * Horizontal bars, sorted by the caller. With `onSelect`, each row is a
 * button that opens its detail (rendered under the row by `renderDetail`).
 */
export function BarList({
  items,
  selected,
  onSelect,
  renderDetail,
  tone = "primary",
}: {
  items: BarItem[];
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  renderDetail?: (key: string) => ReactNode;
  tone?: "primary" | "navy";
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const color = tone === "navy" ? "var(--analytics-navy)" : "var(--analytics-teal)";
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const open = selected === item.key;
        const pct = Math.max(2, Math.round((item.value / max) * 100));
        const body = (
          <>
            <span className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground">{item.label}</span>
              <span className="shrink-0 text-[13px] tabular-nums text-muted">{item.valueLabel}</span>
            </span>
            <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-muted-bg" aria-hidden>
              <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
            </span>
            {item.note ? <span className="mt-1 block text-xs text-muted">{item.note}</span> : null}
          </>
        );
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(open ? null : item.key)}
                aria-expanded={open}
                className={cn(
                  "block w-full rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-muted-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  open && "bg-muted-bg",
                )}
              >
                {body}
              </button>
            ) : (
              <div className="px-3 py-2">{body}</div>
            )}
            {open && renderDetail ? <div className="px-3 pb-3 pt-1">{renderDetail(item.key)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Plain-words number formatting: 1,240 and 1.2k past ten thousand. */
export function formatCount(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("en-US");
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return ms > 0 ? "under a minute" : "0 minutes";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1).replace(/\.0$/, "") : Math.round(hours)} hour${hours === 1 ? "" : "s"}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
