"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Mode = "virtual" | "hybrid" | "physical";

const MODES: Array<{ id: Mode; label: string; board: boolean; sensor: boolean; text: string }> = [
  { id: "virtual", label: "Virtual", board: false, sensor: false, text: "Everything runs in the simulator. No hardware, no waiting." },
  {
    id: "hybrid",
    label: "Hybrid",
    board: true,
    sensor: false,
    text: "Your real board on the bench reads a simulated sensor. Swap in the real one when it arrives.",
  },
  { id: "physical", label: "Physical", board: true, sensor: true, text: "All real. Kiungo still records every reading and every change." },
];

function Device({ real, label, x }: { real: boolean; label: string; x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect
        x="0"
        y="18"
        width="120"
        height="76"
        rx="8"
        fill={real ? "var(--surface)" : "transparent"}
        stroke={real ? "var(--primary)" : "var(--muted)"}
        strokeWidth={real ? 2 : 1.5}
        strokeDasharray={real ? undefined : "6 5"}
        style={{ transition: "stroke 250ms ease, fill 250ms ease" }}
      />
      <text x="60" y="52" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)" fontFamily="var(--font-inter), sans-serif">
        {label}
      </text>
      <text x="60" y="74" textAnchor="middle" fontSize="11" fill={real ? "var(--primary)" : "var(--muted)"} fontFamily="var(--font-jetbrains), monospace">
        {real ? "real, over USB" : "simulated"}
      </text>
    </g>
  );
}

/** A tiny, honest model of device modes: pick one and watch what becomes real. */
export function HybridSwitch() {
  const [mode, setMode] = useState<Mode>("hybrid");
  const current = MODES.find((item) => item.id === mode) ?? MODES[1];

  return (
    <div data-testid="hybrid-switch">
      <div role="radiogroup" aria-label="Device mode" className="inline-flex rounded-[12px] border border-border bg-muted-bg p-1">
        {MODES.map((item) => {
          const checked = item.id === mode;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setMode(item.id)}
              className={cn(
                "rounded-[9px] px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                checked ? "bg-surface text-foreground shadow-[var(--shadow-sm)]" : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <svg viewBox="0 0 360 112" className="mt-6 h-auto w-full max-w-md" role="img" aria-label={`${current.label} mode: ${current.text}`}>
        <Device real={current.board} label="Arduino Uno" x={0} />
        <line x1="120" y1="56" x2="240" y2="56" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
        <text x="180" y="48" textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
          D2
        </text>
        <Device real={current.sensor} label="DHT11" x={240} />
      </svg>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted" aria-live="polite">
        {current.text}
      </p>
    </div>
  );
}
