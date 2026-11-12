"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Play, Square } from "lucide-react";
import { PartModel3D } from "@kiungo/lab/views/PartModel3D";
import arduinoUno from "@kiungo/core/parts/catalog/boards/arduino-uno";
import { cn } from "@/lib/utils";
import type { BlinkPhase, BlinkScene } from "./blink-scene";

/** The one part this page draws, taken from its own file so the page does not load the whole library. */
const ARDUINO_UNO = arduinoUno.model;

const STATUS: Record<BlinkPhase, string> = {
  still: "An Arduino Uno R3, unplugged.",
  plugging: "Plugging in the USB lead, a 220 Ω resistor on pin 13 and a red LED to GND.",
  uploading: "Uploading Blink to the board.",
  blinking: "Blink is running: the LED on pin 13 turns on and off every half second.",
  leaving: "Unplugging.",
};

const noSubscribe = () => () => undefined;
/** Whether this browser can draw WebGL (null while rendering on the server). */
function webgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The Home page's board: the real Arduino Uno R3 model (parts/catalog/boards/
 * arduino-uno.ts), still, from a three-quarter view. Play runs the Blink
 * scene (blink-scene.ts): a USB lead, a resistor and an LED pop in and plug
 * into the board, the sketch uploads, and the LED blinks. Stop unplugs them.
 * Without WebGL the board's top view stands in, and the button is hidden.
 */
export function HeroBoard() {
  const supported = useSyncExternalStore(noSubscribe, webgl, () => null);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<BlinkScene | null>(null);
  const kick = useRef<() => void>(() => undefined);
  const [phase, setPhase] = useState<BlinkPhase>("still");
  const [ready, setReady] = useState(false);
  const running = phase !== "still" && phase !== "leaving";

  useEffect(() => {
    if (!supported || !canvas.current || !host.current) return;
    let disposed = false;
    let frame = 0;
    let visible = true;
    let instance: BlinkScene | null = null;
    const el = host.current;
    const seconds = () => performance.now() / 1000;

    const loop = () => {
      frame = 0;
      if (!instance || disposed) return;
      instance.frame(seconds());
      if (instance.animating && visible) frame = requestAnimationFrame(loop);
    };
    kick.current = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const resize = () => {
      if (!instance) return;
      instance.resize(el.clientWidth, el.clientHeight, window.devicePixelRatio || 1);
      instance.frame(seconds());
    };

    void import("./blink-scene").then(({ BlinkScene }) => {
      if (disposed || !canvas.current) return;
      try {
        instance = new BlinkScene(canvas.current, ARDUINO_UNO);
      } catch {
        return;
      }
      instance.onPhase = (p) => setPhase(p);
      scene.current = instance;
      resize();
      setReady(true);
    });

    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    ro?.observe(el);
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) kick.current();
          })
        : null;
    io?.observe(el);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      io?.disconnect();
      instance?.dispose();
      scene.current = null;
    };
  }, [supported]);

  const toggle = () => {
    const s = scene.current;
    if (!s) return;
    const now = performance.now() / 1000;
    if (running) s.stop(now);
    else {
      const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      s.play(now, reduce);
    }
    kick.current();
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={host} className="relative aspect-[5/4] w-full" data-testid="hero-board" data-phase={phase}>
        {supported === false ? (
          <PartModel3D model={ARDUINO_UNO} powered={false} still={{ spin: -24, tilt: 50 }} className="!h-full !w-full" />
        ) : (
          <canvas
            ref={canvas}
            className={cn("block h-full w-full transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}
            role="img"
            aria-label={`${ARDUINO_UNO.name}. ${STATUS[phase]}`}
            data-testid="hero-scene"
          />
        )}
      </div>

      {supported === false ? null : (
        <button
          type="button"
          onClick={toggle}
          disabled={!ready}
          aria-pressed={running}
          aria-label={running ? "Stop the Blink test" : "Play the Blink test"}
          className={cn(
            "group relative mt-4 grid size-[72px] place-items-center rounded-full text-white transition-[transform,background-color,box-shadow] duration-200",
            "kiungo-grain-teal bg-[#077a7d] shadow-[0_10px_28px_-10px_rgba(7,122,125,0.75),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-[#06666a] active:scale-95",
            "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#077a7d] disabled:opacity-60",
          )}
          data-testid="hero-play"
        >
          {/* A soft halo around the button while the test runs. */}
          {running ? <span className="pointer-events-none absolute -inset-1.5 rounded-full ring-2 ring-[#5fe0db]/60 motion-safe:animate-pulse" aria-hidden /> : null}
          {running ? <Square className="size-6 fill-current" aria-hidden /> : <Play className="ml-1 size-7 fill-current" aria-hidden />}
        </button>
      )}
      <p className="sr-only" aria-live="polite">
        {STATUS[phase]}
      </p>
    </div>
  );
}
