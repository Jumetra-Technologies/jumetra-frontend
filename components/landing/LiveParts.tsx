"use client";

import { useEffect, useRef } from "react";

/**
 * Three simulated parts with live readings: a DHT11, an HC-SR04 and a servo.
 * The numbers are generated in the browser to show what the Engineering Lab
 * looks like while a simulation runs; the real readings come from the
 * simulation engine. Values are written straight to the DOM once a frame.
 */

const REST = { temp: 23.4, humidity: 56, distance: 31.6, angle: 90 };

function readings(t: number) {
  const temp = 23.4 + 1.1 * Math.sin(t / 9) + 0.15 * Math.sin(t * 1.7);
  const humidity = 56 + 4 * Math.sin(t / 13 + 1);
  const distance = 31.6 + 16 * Math.sin(t / 5);
  const angle = 90 + 62 * Math.sin(t / 3.2);
  return { temp, humidity, distance, angle };
}

export function LiveParts() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const temp = q<HTMLElement>("[data-temp]");
    const hum = q<HTMLElement>("[data-humidity]");
    const dist = q<HTMLElement>("[data-distance]");
    const ang = q<HTMLElement>("[data-angle]");
    const horn = q<SVGGElement>("[data-horn]");
    const ping = q<SVGGElement>("[data-ping]");
    const wall = q<SVGRectElement>("[data-wall]");
    const trace = q<SVGPolylineElement>("[data-trace]");
    const history: number[] = [];
    let lastSample = -1;

    const apply = (t: number) => {
      const r = reduce ? REST : readings(t);
      if (temp) temp.textContent = r.temp.toFixed(1);
      if (hum) hum.textContent = Math.round(r.humidity).toString();
      if (dist) dist.textContent = r.distance.toFixed(1);
      if (ang) ang.textContent = Math.round(r.angle).toString();
      if (horn) horn.setAttribute("transform", `rotate(${(r.angle - 90).toFixed(1)} 60 44)`);
      const wallX = 54 + (r.distance / 48) * 92;
      if (wall) wall.setAttribute("x", wallX.toFixed(1));
      if (ping) {
        const phase = reduce ? 0.35 : (t * 1.1) % 1;
        const x = 28 + phase * (wallX - 28);
        ping.setAttribute("transform", `translate(${x.toFixed(1)} 0)`);
        ping.setAttribute("opacity", (1 - phase * 0.6).toFixed(2));
      }
      if (trace && t - lastSample >= 0.17) {
        lastSample = t;
        history.push(r.temp);
        if (history.length > 48) history.shift();
        const points = history.map((v, i) => `${66 + (i / 47) * 80},${74 - (v - 21.5) * 12}`).join(" ");
        trace.setAttribute("points", points);
      }
    };

    if (reduce) {
      apply(0);
      return;
    }
    let frame = 0;
    let visible = true;
    const start = performance.now();
    const tick = (now: number) => {
      if (visible) apply((now - start) / 1000);
      frame = window.requestAnimationFrame(tick);
    };
    const visibility =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    visibility?.observe(root);
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      visibility?.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="grid gap-x-10 gap-y-12 sm:grid-cols-3" data-testid="live-parts">
      {/* DHT11 */}
      <figure className="min-w-0">
        <svg viewBox="0 0 150 90" className="h-28 w-full max-w-[260px]" aria-hidden>
          <rect x="4" y="6" width="54" height="62" rx="4" fill="#2f6fd6" />
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect key={`${r}-${c}`} x={10 + c * 11.5} y={12 + r * 10.5} width="7" height="6.5" rx="1" fill="#1d4ea3" />
            )),
          )}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={12 + i * 12} y="68" width="3" height="16" fill="#b9bdc3" />
          ))}
          <line x1="66" y1="78" x2="146" y2="78" stroke="var(--border)" />
          <polyline data-trace points="" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
          <text x="66" y="12" fontSize="7" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
            temperature, last 8 s
          </text>
        </svg>
        <figcaption className="mt-3">
          <p className="font-mono text-xs text-muted">DHT11, simulated</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
            <span data-temp>{REST.temp.toFixed(1)}</span>
            <span className="text-base text-muted"> °C</span>
            <span className="ml-4" data-humidity>
              {REST.humidity}
            </span>
            <span className="text-base text-muted"> %</span>
          </p>
        </figcaption>
      </figure>

      {/* HC-SR04 */}
      <figure className="min-w-0">
        <svg viewBox="0 0 150 90" className="h-28 w-full max-w-[260px]" aria-hidden>
          <rect x="2" y="22" width="30" height="46" rx="3" fill="#1e5fbf" />
          <circle cx="17" cy="33" r="7.5" fill="#b9bdc3" stroke="#6b7280" />
          <circle cx="17" cy="57" r="7.5" fill="#b9bdc3" stroke="#6b7280" />
          <g data-ping opacity="1">
            <path d="M0 33 q6 6 0 12" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
            <path d="M6 29 q9 10 0 20" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6" />
          </g>
          <rect data-wall x="100" y="18" width="6" height="54" rx="1" fill="var(--muted)" />
          <line x1="34" y1="80" x2="146" y2="80" stroke="var(--border)" />
          <text x="34" y="88" fontSize="7" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
            0
          </text>
          <text x="146" y="88" fontSize="7" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
            48 cm
          </text>
        </svg>
        <figcaption className="mt-3">
          <p className="font-mono text-xs text-muted">HC-SR04, simulated</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
            <span data-distance>{REST.distance.toFixed(1)}</span>
            <span className="text-base text-muted"> cm</span>
          </p>
        </figcaption>
      </figure>

      {/* Servo */}
      <figure className="min-w-0">
        <svg viewBox="0 0 150 90" className="h-28 w-full max-w-[260px]" aria-hidden>
          <rect x="22" y="30" width="76" height="46" rx="4" fill="#1b1c1f" />
          <rect x="12" y="46" width="10" height="14" rx="2" fill="#1b1c1f" />
          <rect x="98" y="46" width="10" height="14" rx="2" fill="#1b1c1f" />
          <circle cx="60" cy="44" r="12" fill="#2b2d31" />
          <g data-horn transform="rotate(0 60 44)">
            <rect x="57.5" y="12" width="5" height="34" rx="2.5" fill="#e5e7eb" />
            <circle cx="60" cy="44" r="4" fill="#9ca3af" />
            <circle cx="60" cy="17" r="1.6" fill="#6b7280" />
            <circle cx="60" cy="24" r="1.6" fill="#6b7280" />
          </g>
          <text x="118" y="30" fontSize="7" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
            0°
          </text>
          <text x="118" y="62" fontSize="7" fill="var(--muted)" fontFamily="var(--font-jetbrains), monospace">
            180°
          </text>
        </svg>
        <figcaption className="mt-3">
          <p className="font-mono text-xs text-muted">Servo, simulated</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
            <span data-angle>{REST.angle}</span>
            <span className="text-base text-muted"> °</span>
          </p>
        </figcaption>
      </figure>
    </div>
  );
}
