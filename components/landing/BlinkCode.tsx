"use client";

import { forwardRef, type Ref } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLINK_STEPS, type BlinkPhase } from "./blink-scene";
import styles from "./hero-board.module.css";

type Kind = "kw" | "fn" | "num" | "high" | "low" | "const" | "punct" | "text";
type Token = [string, Kind];

/** The Blink sketch the scene uploads, token by token so it can be colored. */
const SKETCH: Token[][] = [
  [["void", "kw"], [" setup", "fn"], ["() {", "punct"]],
  [["  pinMode", "fn"], ["(", "punct"], ["13", "num"], [", ", "punct"], ["OUTPUT", "const"], [");", "punct"]],
  [["}", "punct"]],
  [["void", "kw"], [" loop", "fn"], ["() {", "punct"]],
  [["  digitalWrite", "fn"], ["(", "punct"], ["13", "num"], [", ", "punct"], ["HIGH", "high"], [");", "punct"]],
  [["  delay", "fn"], ["(", "punct"], ["500", "num"], [");", "punct"]],
  [["  digitalWrite", "fn"], ["(", "punct"], ["13", "num"], [", ", "punct"], ["LOW", "low"], [");", "punct"]],
  [["  delay", "fn"], ["(", "punct"], ["500", "num"], [");", "punct"]],
  [["}", "punct"]],
];
/** The lines that run while the LED is on, and while it is off. */
const ON_LINES = [4, 5];
const OFF_LINES = [6, 7];
const HIGH_LINE = 4;
const LOW_LINE = 6;

const COLOR: Record<Kind, string> = {
  kw: "text-[#5fe0db]",
  fn: "text-[#f3cf7a]",
  num: "text-[#ffab8a]",
  high: "text-[#ff8a8a]",
  low: "text-[#9fb0ba]",
  const: "text-[#c7b1ff]",
  punct: "text-[#7d8d97]",
  text: "text-[#d8e1e6]",
};

const HEADER: Record<BlinkPhase, string> = {
  still: "Ready",
  plugging: "Wiring the board",
  uploading: "Uploading",
  blinking: "Running",
  leaving: "Stopping",
};

export interface BlinkCodeProps {
  phase: BlinkPhase;
  /** Which build step is under way (BLINK_STEPS), or -1 when idle. */
  step: number;
  /** Whether pin 13 is HIGH right now. */
  led: boolean;
  /** Ends of the HIGH and LOW lines, where the signal trace starts. */
  anchors?: { high: Ref<HTMLSpanElement>; low: Ref<HTMLSpanElement> };
  className?: string;
}

/**
 * The code half of the Blink test: the sketch on the board, shown beside the
 * hardware. While Play runs it ticks off each wiring step, scans the sketch as
 * it uploads, then lights the line that is running in step with the LED.
 */
export const BlinkCode = forwardRef(function BlinkCode({ phase, step, led, anchors, className }: BlinkCodeProps, ref: Ref<HTMLElement>) {
  const running = phase === "blinking";
  const active = running ? (led ? ON_LINES : OFF_LINES) : [];

  return (
    <figure
      ref={ref}
      className={cn(
        styles.enter,
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1920]/95 text-left shadow-[0_24px_60px_-24px_rgba(7,60,70,0.55),0_2px_6px_-2px_rgba(0,0,0,0.25)] backdrop-blur-md",
        className,
      )}
      aria-label="The Blink sketch: pin 13 HIGH, wait 500 ms, LOW, wait 500 ms, repeat."
      data-testid="hero-code"
      data-led={running ? (led ? "high" : "low") : "off"}
    >
      {/* Upload progress, along the top edge. */}
      <span className="absolute inset-x-0 top-0 h-[2px] overflow-hidden" aria-hidden>
        {phase === "uploading" || phase === "blinking" ? (
          <span
            className={cn(
              "block h-full origin-left bg-gradient-to-r from-[#077a7d] via-[#5fe0db] to-[#a8f3ef] transition-opacity duration-700",
              styles.progress,
              running && "opacity-0",
            )}
          />
        ) : null}
      </span>

      <figcaption className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5 font-mono text-[11px] tracking-wide">
        <span className="text-[#d8e1e6]">blink.ino</span>
        <span className="flex items-center gap-2 text-[#7d8d97]" aria-hidden>
          {running ? (
            <>
              <span
                className={cn(
                  "size-1.5 rounded-full transition-[background-color,box-shadow] duration-150",
                  led ? "bg-[#ff4a3d] shadow-[0_0_8px_2px_rgba(255,74,61,0.7)]" : "bg-[#3a4950]",
                )}
              />
              <span className="w-[86px] text-right tabular-nums">
                pin 13 <span className={led ? "text-[#ff8a8a]" : "text-[#9fb0ba]"}>{led ? "HIGH" : "LOW"}</span>
              </span>
            </>
          ) : (
            <span className={cn(phase !== "still" && "text-[#5fe0db]")}>{HEADER[phase]}</span>
          )}
        </span>
      </figcaption>

      <div className="relative">
        {phase === "uploading" ? <span key="scan" className={cn("pointer-events-none absolute inset-0", styles.scan)} aria-hidden /> : null}
        <pre className="relative py-2.5 font-mono text-[12px] leading-[20px]">
          <code>
            {SKETCH.map((line, i) => {
              const on = active.includes(i);
              return (
                <span
                  key={i}
                  className={cn(
                    "relative flex pr-4 transition-[background-color,opacity] duration-200 ease-out",
                    on && (led ? "bg-[#e0252b]/[0.14]" : "bg-[#5fe0db]/[0.08]"),
                    running && !on && "opacity-55",
                  )}
                >
                  {/* The run marker in the gutter. */}
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-[2px] transition-[background-color] duration-200",
                      on ? (led ? "bg-[#ff4a3d]" : "bg-[#5fe0db]") : "bg-transparent",
                    )}
                    aria-hidden
                  />
                  <span className="w-9 shrink-0 select-none pr-3 text-right text-[#3f525c]" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="whitespace-pre">
                    {line.map(([text, kind], j) => (
                      <span
                        key={j}
                        className={cn(
                          COLOR[kind],
                          "transition-[color,text-shadow] duration-150",
                          kind === "high" && running && led && "text-[#ffd0cc] [text-shadow:0_0_10px_rgba(255,74,61,0.9)]",
                        )}
                      >
                        {text}
                      </span>
                    ))}
                    {i === HIGH_LINE ? <span ref={anchors?.high} className="inline-block w-0" aria-hidden /> : null}
                    {i === LOW_LINE ? <span ref={anchors?.low} className="inline-block w-0" aria-hidden /> : null}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>

      {/* The build, step by step: hardware, then code. */}
      <ol className="flex items-center justify-between gap-1 border-t border-white/[0.06] px-4 py-2.5 font-mono text-[10px] leading-none" aria-hidden>
        {BLINK_STEPS.map((label, i) => {
          const done = step > i || (running && i === BLINK_STEPS.length - 1);
          const now = step === i && !done;
          return (
            <li key={label} className="flex min-w-0 items-center gap-1.5">
              <span
                key={done ? "done" : "todo"}
                className={cn(
                  "grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                  done ? cn("border-[#5fe0db] bg-[#5fe0db] text-[#0b1920]", styles.pop) : now ? "border-[#5fe0db] motion-safe:animate-pulse" : "border-[#33454e]",
                )}
              >
                {done ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
              </span>
              <span className={cn("truncate transition-colors duration-300", done ? "text-[#d8e1e6]" : now ? "text-[#5fe0db]" : "text-[#5b6d76]")}>{label}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
});
