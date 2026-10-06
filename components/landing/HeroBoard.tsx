"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./hero-board.module.css";

/**
 * An original development board in the Arduino Uno layout, drawn as a solid
 * slab in CSS 3D. It turns slowly on its own, can be grabbed and turned, and
 * its pin-13 LED runs Blink when clicked.
 *
 * Nothing here depends on the theme: a board looks the same in every palette.
 */

const BOARD = { w: 340, h: 264 };
const SPIN_DEG_PER_S = 11;
const RESUME_AFTER_MS = 2200;

interface Part {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  top: string;
  side: string;
  radius?: number;
  kind?: "header" | "chip" | "plain";
  pins?: number;
  label?: string[];
  /** A dark opening drawn on the board-edge face, for sockets. */
  socket?: boolean;
}

const steel = "linear-gradient(180deg, #d7dadf 0%, #b9bdc3 55%, #9ea3aa 100%)";

const PARTS: Part[] = [
  { id: "usb", x: -18, y: 24, w: 70, h: 58, z: 46, top: steel, side: "#8f949b", radius: 3, socket: true },
  { id: "jack", x: -14, y: 196, w: 64, h: 46, z: 44, top: "linear-gradient(180deg,#34363b,#222326)", side: "#111214", radius: 3, socket: true },
  { id: "hdr-digital-hi", x: 92, y: 8, w: 126, h: 13, z: 36, top: "#141517", side: "#090a0b", kind: "header", pins: 10 },
  { id: "hdr-digital-lo", x: 222, y: 8, w: 101, h: 13, z: 36, top: "#141517", side: "#090a0b", kind: "header", pins: 8 },
  { id: "hdr-power", x: 118, y: 243, w: 101, h: 13, z: 36, top: "#141517", side: "#090a0b", kind: "header", pins: 8 },
  { id: "hdr-analog", x: 231, y: 243, w: 76, h: 13, z: 36, top: "#141517", side: "#090a0b", kind: "header", pins: 6 },
  { id: "icsp", x: 306, y: 104, w: 25, h: 38, z: 30, top: "#141517", side: "#090a0b", kind: "header", pins: 3 },
  {
    id: "mcu",
    x: 150,
    y: 168,
    w: 173,
    h: 38,
    z: 18,
    top: "linear-gradient(180deg,#232428,#17181b)",
    side: "#0d0e10",
    kind: "chip",
    label: ["ATMEGA328P", "16 MHz"],
  },
  { id: "usb-mcu", x: 72, y: 88, w: 22, h: 22, z: 6, top: "#1b1c1f", side: "#0d0e10" },
  { id: "crystal", x: 104, y: 182, w: 40, h: 14, z: 12, top: steel, side: "#8f949b", radius: 7 },
  { id: "reset", x: 62, y: 30, w: 22, h: 22, z: 12, top: "radial-gradient(circle,#cfd3d8 0 5px,#2b2d31 6px)", side: "#111214", radius: 3 },
  { id: "regulator", x: 68, y: 200, w: 30, h: 36, z: 10, top: "linear-gradient(90deg,#b9bdc3 0 9px,#1b1c1f 9px)", side: "#0d0e10" },
  { id: "cap-1", x: 102, y: 150, w: 16, h: 16, z: 20, top: "radial-gradient(circle,#8a8f96 0 3px,#3a3d42 4px)", side: "#202226", radius: 8 },
  { id: "cap-2", x: 124, y: 150, w: 16, h: 16, z: 20, top: "radial-gradient(circle,#8a8f96 0 3px,#3a3d42 4px)", side: "#202226", radius: 8 },
];

const TOP_PINS = ["SCL", "SDA", "AREF", "GND", "13", "12", "~11", "~10", "~9", "8", "7", "~6", "~5", "4", "~3", "2", "1", "0"];
const POWER_PINS = ["", "IOREF", "RESET", "3.3V", "5V", "GND", "GND", "VIN"];
const ANALOG_PINS = ["A0", "A1", "A2", "A3", "A4", "A5"];

function PcbTop() {
  const pitch = 12.6;
  return (
    <svg viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} aria-hidden>
      <defs>
        <linearGradient id="hb-pcb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#257a63" />
          <stop offset="0.55" stopColor="#1f6b57" />
          <stop offset="1" stopColor="#185a48" />
        </linearGradient>
        <radialGradient id="hb-sheen" cx="0.25" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={BOARD.w} height={BOARD.h} rx="9" fill="url(#hb-pcb)" />
      {/* Copper traces under the mask */}
      <g fill="none" stroke="#2f8f73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M60 60 H78 V88" />
        <path d="M94 99 H110 V140 H150" />
        <path d="M106 112 H126 V168" />
        <path d="M118 28 V60 H140" />
        <path d="M232 26 V52 H262 V110 H290 V168" />
        <path d="M270 26 V70 H300 V100" />
        <path d="M160 206 V236" />
        <path d="M206 206 V236" />
        <path d="M250 206 V236" />
        <path d="M282 206 V236" />
        <path d="M58 150 H96" />
        <path d="M50 230 H66" />
      </g>
      <rect width={BOARD.w} height={BOARD.h} rx="9" fill="url(#hb-sheen)" />
      {/* Mounting holes */}
      {[
        [12, 126],
        [328, 54],
        [328, 246],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="6" fill="#d9b05c" />
          <circle cx={cx} cy={cy} r="3.6" fill="#0f3a2e" />
        </g>
      ))}
      {/* Silkscreen */}
      <g fill="#e9f1ec" fontFamily="var(--font-jetbrains), ui-monospace, monospace">
        <text x="186" y="118" fontSize="30" fontWeight="800" letterSpacing="1" fontFamily="var(--font-inter), ui-sans-serif, sans-serif">
          HHIP
        </text>
        <text x="187" y="134" fontSize="7.5" letterSpacing="1.5">
          DEV BOARD
        </text>
        <text x="246" y="134" fontSize="7.5" letterSpacing="1.5" opacity="0.8">
          REV 1
        </text>
        <text x="126" y="34" fontSize="6.5" letterSpacing="1">
          DIGITAL (PWM~)
        </text>
        {TOP_PINS.map((name, i) => {
          const blockOffset = i < 10 ? 92 + 6 : 222 + 6 - 10 * pitch;
          const x = blockOffset + i * pitch;
          return (
            <text key={`t-${i}`} x={x} y={44} fontSize="5.5" textAnchor="end" transform={`rotate(-90 ${x} 44)`}>
              {name}
            </text>
          );
        })}
        <text x="118" y="238" fontSize="6.5" letterSpacing="1">
          POWER
        </text>
        <text x="256" y="238" fontSize="6.5" letterSpacing="1">
          ANALOG IN
        </text>
        {POWER_PINS.map((name, i) => {
          const x = 118 + 6 + i * pitch;
          return (
            <text key={`p-${i}`} x={x} y={228} fontSize="5.5" textAnchor="start" transform={`rotate(-90 ${x} 228)`}>
              {name}
            </text>
          );
        })}
        {ANALOG_PINS.map((name, i) => {
          const x = 231 + 6 + i * pitch;
          return (
            <text key={`a-${i}`} x={x} y={228} fontSize="5.5" transform={`rotate(-90 ${x} 228)`}>
              {name}
            </text>
          );
        })}
        <text x="164" y="42" fontSize="6.5">
          L
        </text>
        <text x="164" y="56" fontSize="6.5">
          TX
        </text>
        <text x="164" y="70" fontSize="6.5">
          RX
        </text>
        <text x="164" y="106" fontSize="6.5">
          ON
        </text>
        <text x="306" y="100" fontSize="5.5">
          ICSP
        </text>
        <text x="62" y="60" fontSize="5.5">
          RESET
        </text>
        <text x="100" y="120" fontSize="5.5">
          USB
        </text>
        <text x="12" y="190" fontSize="5.5">
          7-12V
        </text>
      </g>
      {/* Gold test pads */}
      <g fill="#d9b05c">
        <circle cx="146" cy="120" r="2.6" />
        <circle cx="146" cy="128" r="2.6" />
        <circle cx="146" cy="136" r="2.6" />
      </g>
    </svg>
  );
}

function RaisedPart({ part }: { part: Part }) {
  const style = {
    left: part.x,
    top: part.y,
    "--bw": `${part.w}px`,
    "--bh": `${part.h}px`,
    "--bz": `${part.z}px`,
    "--top": part.top,
    "--side": part.side,
    "--br": `${part.radius ?? 2}px`,
  } as CSSProperties;

  return (
    <div className={styles.part} style={style} data-part={part.id}>
      <div className={`${styles.face} ${styles.partTop}`}>
        {part.kind === "header" ? (
          part.id === "icsp" ? (
            <div className={styles.pins} style={{ flexDirection: "column" }}>
              {Array.from({ length: 3 }, (_, row) => (
                <span key={row} style={{ display: "flex", gap: 6 }}>
                  <i />
                  <i />
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.pins}>
              {Array.from({ length: part.pins ?? 0 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          )
        ) : null}
        {part.kind === "chip" ? (
          <>
            <span className={styles.notch} />
            <span className={styles.chipLabel}>
              {part.label?.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </>
        ) : null}
      </div>
      {part.kind === "chip" ? (
        <>
          <div className={`${styles.legs} ${styles.legsTop}`} style={{ transform: `translateZ(${part.z / 2 - 2}px)` }} />
          <div className={`${styles.legs} ${styles.legsBottom}`} style={{ transform: `translateZ(${part.z / 2 - 2}px)` }} />
        </>
      ) : null}
      <div className={`${styles.face} ${styles.partRight}`} />
      <div className={`${styles.face} ${styles.partLeft}`}>{part.socket ? <span className={styles.socket} /> : null}</div>
      <div className={`${styles.face} ${styles.partFront}`} />
      <div className={`${styles.face} ${styles.partBack}`} />
    </div>
  );
}

export function HeroBoard({ hint }: { hint: string }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [ledOn, setLedOn] = useState(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = { spin: -18, tilt: 52, velocity: 0, dragging: false, hovering: false, visible: true, resumeAt: 0, lastX: 0, lastY: 0 };
    // Recent spin samples, for a fling that matches how fast the hand was moving.
    const samples: Array<{ t: number; spin: number }> = [];
    let frame = 0;
    let last = performance.now();

    const paint = () => {
      scene.style.setProperty("--spin", `${state.spin.toFixed(2)}deg`);
      scene.style.setProperty("--tilt", `${state.tilt.toFixed(2)}deg`);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!state.visible) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      if (!state.dragging) {
        if (Math.abs(state.velocity) > 0.02) {
          state.spin += state.velocity * dt * 60;
          state.velocity *= Math.pow(0.9, dt * 60);
        } else if (!reduce && !state.hovering && now >= state.resumeAt) {
          state.spin += SPIN_DEG_PER_S * dt;
        }
      }
      paint();
      frame = window.requestAnimationFrame(tick);
    };

    const onDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return;
      // The LED is a control of its own; a press on it must not start a drag.
      if (event.target instanceof Element && event.target.closest('[role="switch"]')) return;
      state.dragging = true;
      state.velocity = 0;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      samples.length = 0;
      samples.push({ t: performance.now(), spin: state.spin });
      scene.setPointerCapture?.(event.pointerId);
      scene.dataset.dragging = "";
    };
    const onMove = (event: globalThis.PointerEvent) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.spin += dx * 0.45;
      state.tilt = Math.min(80, Math.max(16, state.tilt - dy * 0.3));
      const now = performance.now();
      samples.push({ t: now, spin: state.spin });
      while (samples.length > 1 && now - samples[0].t > 90) samples.shift();
      paint();
    };
    const onUp = () => {
      if (!state.dragging) return;
      state.dragging = false;
      delete scene.dataset.dragging;
      state.resumeAt = performance.now() + RESUME_AFTER_MS;
      // Fling: degrees per frame over the last ~90 ms, capped so it stays a nudge, not a launch.
      const now = performance.now();
      const oldest = samples[0];
      const elapsed = oldest ? now - oldest.t : 0;
      const perFrame = oldest && elapsed > 16 && now - samples[samples.length - 1].t < 80 ? ((state.spin - oldest.spin) / elapsed) * 16.7 : 0;
      state.velocity = reduce ? 0 : Math.max(-14, Math.min(14, perFrame));
      samples.length = 0;
    };
    const onEnter = () => {
      state.hovering = true;
    };
    const onLeave = () => {
      state.hovering = false;
      state.resumeAt = performance.now() + 600;
    };

    // Only animate while on screen.
    const visibility =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            state.visible = entry.isIntersecting;
            last = performance.now();
          })
        : null;
    visibility?.observe(scene);

    paint();
    frame = window.requestAnimationFrame(tick);
    scene.addEventListener("pointerenter", onEnter);
    scene.addEventListener("pointerleave", onLeave);
    scene.addEventListener("pointerdown", onDown);
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerup", onUp);
    scene.addEventListener("pointercancel", onUp);
    scene.addEventListener("lostpointercapture", onUp);

    const onKey = (event: globalThis.KeyboardEvent) => {
      const step = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key];
      if (!step) return;
      event.preventDefault();
      state.spin += step[0];
      state.tilt = Math.min(80, Math.max(16, state.tilt + step[1]));
      state.resumeAt = performance.now() + RESUME_AFTER_MS;
      paint();
    };
    scene.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(frame);
      visibility?.disconnect();
      scene.removeEventListener("pointerenter", onEnter);
      scene.removeEventListener("pointerleave", onLeave);
      scene.removeEventListener("pointerdown", onDown);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerup", onUp);
      scene.removeEventListener("pointercancel", onUp);
      scene.removeEventListener("lostpointercapture", onUp);
      scene.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggleLed = () => setLedOn((on) => !on);
  const ledKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      toggleLed();
    }
  };

  return (
    <div>
      <div
        ref={sceneRef}
        className={styles.scene}
        role="group"
        aria-roledescription="interactive 3D model"
        aria-label="A development board in the Arduino Uno layout, turning slowly. It pauses under the pointer. Use the arrow keys or drag to turn it."
        tabIndex={0}
        data-testid="hero-board"
      >
        <div className={styles.stage}>
          <div className={styles.shadow} aria-hidden />
          <div className={`${styles.face} ${styles.slabTop}`}>
            <PcbTop />
          </div>
          <div className={`${styles.face} ${styles.slabBottom}`} />
          <div className={`${styles.face} ${styles.slabRight}`} />
          <div className={`${styles.face} ${styles.slabLeft}`} />
          <div className={`${styles.face} ${styles.slabFront}`} />
          <div className={`${styles.face} ${styles.slabBack}`} />

          {PARTS.map((part) => (
            <RaisedPart key={part.id} part={part} />
          ))}

          <span className={`${styles.led} ${styles.ledPower}`} style={{ left: 150, top: 101 }} aria-hidden />
          <span className={styles.led} style={{ left: 150, top: 51 }} aria-hidden />
          <span className={styles.led} style={{ left: 150, top: 65 }} aria-hidden />
          <span
            role="switch"
            aria-checked={ledOn}
            aria-label="Pin 13 LED. Press to run Blink."
            tabIndex={0}
            className={`${styles.led} ${styles.ledUser}`}
            style={{ left: 150, top: 37 }}
            data-on={ledOn ? "" : undefined}
            data-testid="hero-led"
            onClick={toggleLed}
            onKeyDown={ledKey}
          />
        </div>
      </div>

      <p className="mt-2 font-mono text-xs leading-5 text-muted" aria-live="polite">
        {ledOn ? (
          <>
            Pin 13 is blinking. That&apos;s the Blink sketch, the first program anyone uploads.{" "}
            <Link href="/learn/blink-an-led-with-arduino" className="text-primary underline-offset-4 hover:underline">
              Learn it in 20 minutes
            </Link>
          </>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}
