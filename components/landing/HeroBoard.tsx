"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { PartModel3D } from "@/components/library/views/PartModel3D";
import { ARDUINO_UNO } from "@kiungo/core/parts/models/arduino-uno";
import { cn } from "@/lib/utils";

/** Blink's period: on for half a second, off for half a second. */
const BLINK_MS = 500;

/**
 * The Home page's board: the same Arduino Uno R3 the Component library and
 * the Engineering Lab draw (lib/parts/models/arduino-uno.ts), as a 3D model
 * that turns slowly, pauses under the pointer, and can be dragged or turned
 * with the arrow keys. Run Blink flashes its pin-13 "L" LED the way the
 * first sketch anyone uploads does. The ON LED is lit throughout.
 */
export function HeroBoard({ hint }: { hint: string }) {
  const [blinking, setBlinking] = useState(false);
  const [ledOn, setLedOn] = useState(false);

  useEffect(() => {
    if (!blinking) return;
    const t = window.setInterval(() => setLedOn((on) => !on), BLINK_MS);
    return () => {
      window.clearInterval(t);
      setLedOn(false);
    };
  }, [blinking]);

  const lit = ledOn ? ["led-on", "led-l"] : ["led-on"];

  return (
    <div>
      <div className="relative aspect-[5/4] w-full" data-testid="hero-board" data-blinking={blinking ? "true" : undefined}>
        <PartModel3D model={ARDUINO_UNO} powered lit={lit} className="!h-full !w-full" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={blinking}
          aria-label="Run Blink on pin 13"
          onClick={() => setBlinking((on) => !on)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
            blinking ? "border-[#f5a524] bg-[color-mix(in_srgb,#f5a524_14%,var(--surface))] text-foreground" : "border-border bg-surface text-foreground hover:border-primary",
          )}
          data-testid="hero-led"
        >
          <span className={cn("size-2 rounded-full transition-colors", ledOn ? "bg-[#ffb020] shadow-[0_0_8px_2px_#ffb02099]" : "bg-[color-mix(in_srgb,#ffb020_35%,var(--border))]")} aria-hidden />
          {blinking ? <Square className="size-3" aria-hidden /> : <Play className="size-3" aria-hidden />}
          {blinking ? "Stop Blink" : "Run Blink"}
        </button>
        <p className="min-w-0 flex-1 font-mono text-xs leading-5 text-muted" aria-live="polite">
          {blinking ? (
            <>
              The L LED by pin 13 is blinking: that&apos;s Blink, the first program anyone uploads.{" "}
              <Link href="/learn/blink-an-led-with-arduino" className="text-primary underline-offset-4 hover:underline">
                Learn it in 20 minutes
              </Link>
            </>
          ) : (
            hint
          )}
        </p>
      </div>
    </div>
  );
}
