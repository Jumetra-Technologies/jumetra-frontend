"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { ActivityEvent, CalendarDay } from "@/lib/analytics/personal";
import { dayKey } from "@/lib/analytics/personal";

import styles from "./analytics.module.css";

const KIND_WORDS: Partial<Record<ActivityEvent["kind"], [string, string]>> = {
  run: ["run", "runs"],
  build: ["build step", "build steps"],
  wire: ["wire", "wires"],
  fix: ["fix", "fixes"],
  fault: ["fault", "faults"],
  project: ["new project", "new projects"],
  experiment: ["record", "records"],
  session: ["new session", "new sessions"],
  state: ["state change", "state changes"],
  note: ["note", "notes"],
};

export function describeDay(events: ActivityEvent[]): string {
  if (events.length === 0) return "nothing";
  const counts = new Map<ActivityEvent["kind"], number>();
  for (const e of events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kind, n]) => {
      const words = KIND_WORDS[kind] ?? [kind, `${kind}s`];
      return `${n} ${n === 1 ? words[0] : words[1]}`;
    })
    .join(", ");
}

export function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Bigger holes when there are fewer weeks, so a short range still fills the card. */
function holeSize(weeks: number): number {
  return weeks <= 6 ? 24 : weeks <= 14 ? 20 : weeks <= 27 ? 15 : 12;
}

/**
 * One column per week, Monday at the top. Arrow keys move between days,
 * Enter or a click picks one; the page shows what happened that day.
 */
export function BreadboardCalendar({
  weeks,
  eventsByDay,
  selected,
  onSelect,
  today,
}: {
  weeks: CalendarDay[][];
  eventsByDay: Map<string, ActivityEvent[]>;
  selected: string | null;
  onSelect: (key: string | null) => void;
  today: Date;
}) {
  const todayKey = dayKey(today);
  const flat = useMemo(() => weeks.flat(), [weeks]);
  const [focusKey, setFocusKey] = useState<string>(() => selected ?? todayKey);
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const scroller = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Start scrolled to this week on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  const months = useMemo(() => {
    const out: Array<{ col: number; label: string }> = [];
    let last = -1;
    weeks.forEach((week, col) => {
      const first = week.find((d) => d.date.getDate() <= 7) ?? null;
      const m = first ? first.date.getMonth() : -1;
      if (first && m !== last) {
        out.push({ col, label: first.date.toLocaleDateString("en-US", { month: "short" }) });
        last = m;
      }
    });
    return out;
  }, [weeks]);

  const showTip = (key: string) => {
    const btn = refs.current.get(key);
    const board = boardRef.current;
    if (!btn || !board) return;
    const b = btn.getBoundingClientRect();
    const o = board.getBoundingClientRect();
    setTip({ key, x: b.left - o.left + b.width / 2, y: b.top - o.top });
  };

  const move = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const i = flat.findIndex((d) => d.key === key);
    const delta = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -i, End: flat.length - 1 - i }[event.key as "ArrowUp"];
    if (delta === undefined) return;
    event.preventDefault();
    let j = Math.max(0, Math.min(flat.length - 1, i + delta));
    while (j > 0 && !flat[j].inRange && delta > 0) j--; // don't step into the future
    const next = flat[j];
    setFocusKey(next.key);
    refs.current.get(next.key)?.focus();
  };

  const tipDay = tip ? flat.find((d) => d.key === tip.key) : null;

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-2">
        <div ref={boardRef} className={styles.board} style={{ ["--hole-size" as string]: `${holeSize(weeks.length)}px` }} role="grid" aria-label="Days you worked in Kiungo, one column per week">
          <div />
          <div className={styles.months} aria-hidden>
            {weeks.map((_, col) => {
              const m = months.find((x) => x.col === col);
              return <span key={col}>{m ? m.label : ""}</span>;
            })}
          </div>
          <div className={styles.labels} aria-hidden>
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div className={styles.days}>
            {weeks.map((week, col) => (
              <div key={col} role="row" style={{ display: "contents" }}>
                {week.map((day, row) => {
                  const events = eventsByDay.get(day.key) ?? [];
                  const label = `${longDate(day.date)}: ${day.inRange ? describeDay(events) : "outside this range"}`;
                  const hole = (
                    <button
                      key={day.key}
                      ref={(el) => {
                        if (el) refs.current.set(day.key, el);
                        else refs.current.delete(day.key);
                      }}
                      type="button"
                      role="gridcell"
                      className={styles.hole}
                      style={{ gridColumn: col + 1, gridRow: row < 5 ? row + 1 : row + 2 }}
                      data-level={day.level}
                      data-out={!day.inRange}
                      data-today={day.key === todayKey}
                      aria-label={label}
                      aria-selected={selected === day.key}
                      aria-disabled={!day.inRange || undefined}
                      tabIndex={day.key === focusKey ? 0 : -1}
                      onClick={() => day.inRange && onSelect(selected === day.key ? null : day.key)}
                      onKeyDown={(e) => move(e, day.key)}
                      onMouseEnter={() => showTip(day.key)}
                      onMouseLeave={() => setTip(null)}
                      onFocus={() => {
                        setFocusKey(day.key);
                        showTip(day.key);
                      }}
                      onBlur={() => setTip(null)}
                    />
                  );
                  return row === 5 ? [<div key={`ch-${col}`} className={styles.channel} style={{ gridColumn: col + 1, gridRow: 6 }} aria-hidden />, hole] : hole;
                })}
              </div>
            ))}
          </div>
          {tip && tipDay ? (
            <div className={styles.tip} style={{ left: tip.x, top: tip.y }} role="presentation">
              <strong className="font-semibold">{longDate(tipDay.date)}</strong>
              <br />
              {tipDay.inRange ? describeDay(eventsByDay.get(tipDay.key) ?? []) : "Outside this range"}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted">
        <span>Less</span>
        <span className={styles.legend} aria-hidden>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={styles.hole} data-level={l} style={{ display: "inline-block" }} />
          ))}
        </span>
        <span>More</span>
      </div>
    </div>
  );
}
