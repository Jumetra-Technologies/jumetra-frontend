"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { findControl, isSet, type NumberControl } from "@kiungo/core/lab/controls";
import { HC_SR04_BEAM, beamHalfWidth, echoOff, type Beam, type Echo, type Obstacle } from "@kiungo/core/lab/obstacle";
import { hcSr04Obstacle } from "@kiungo/core/lab/sketch";
import { formatQuantity } from "@kiungo/core/lab/units";
import type { LabNode } from "@kiungo/core/lab/types";
import { useLab } from "./store";
import { useLabContext } from "./lab-context";

/**
 * The obstacle test under an HC-SR04's surroundings: the sensor's beam seen
 * from above and the obstacle in front of it. Drag the obstacle (or select it
 * and use the arrow keys) and the sensor's reading follows, from the same
 * model the simulation and the emulated module use.
 */
export function ObstacleTest({ node }: { node: LabNode }) {
  const { session, frame } = useLabContext();
  const setInput = useLab((s) => s.setInput);
  const obstacle = hcSr04Obstacle(node.id, frame.t, session.inputs);
  const held = isSet(session.inputs, node.id);
  const move = (next: { distance: number; offset: number }) => {
    if (next.distance !== obstacle.distance || !held) setInput(node.id, "distance", next.distance, frame.t);
    if (next.offset !== obstacle.offset) setInput(node.id, "offset", next.offset, frame.t);
  };
  return <ObstacleView obstacle={obstacle} echo={echoOff(HC_SR04_BEAM, obstacle)} held={held} onMove={move} />;
}

type Span = "1" | "4";

const W = 280;
const H = 128;
/** The sensor's face, in the drawing. */
const X0 = 26;
const CY = H / 2;
const RIGHT_PAD = 14;

const distanceControl = () => findControl("hc-sr04", "distance") as NumberControl;
const offsetControl = () => findControl("hc-sr04", "offset") as NumberControl;
const clamp = (v: number, c: NumberControl) => Math.min(c.max, Math.max(c.min, v));
/** To the millimeter, as the inputs keep it. */
const mm = (v: number) => Math.round(v * 1000) / 1000;

/** Ticks along the beam, in meters, and how each is labeled. */
const TICKS: Record<Span, Array<[number, string]>> = {
  "1": [
    [0.25, "25 cm"],
    [0.5, "50 cm"],
    [0.75, "75 cm"],
    [1, "1 m"],
  ],
  "4": [
    [1, "1 m"],
    [2, "2 m"],
    [3, "3 m"],
    [4, "4 m"],
  ],
};

/** The test drawn: pure, so it can be shown and tested without a lab around it. */
export function ObstacleView({ obstacle, echo, held, onMove, beam = HC_SR04_BEAM }: { obstacle: Obstacle; echo: Echo | null; held: boolean; onMove: (next: { distance: number; offset: number }) => void; beam?: Beam }) {
  const [span, setSpan] = useState<Span>(() => (obstacle.distance > 0.95 || Math.abs(obstacle.offset) > 0.24 ? "4" : "1"));
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const scale = (W - X0 - RIGHT_PAD) / Number(span);
  const px = (d: number) => X0 + d * scale;
  const py = (offset: number) => CY - offset * scale;

  const place = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    const x = ((event.clientX - box.left) / box.width) * W;
    const y = ((event.clientY - box.top) / box.height) * H;
    onMove({ distance: mm(clamp((x - X0) / scale, distanceControl())), offset: mm(clamp((CY - y) / scale, offsetControl())) });
  };

  const key = (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const d = { ArrowRight: step, ArrowLeft: -step }[event.key] ?? 0;
    const o = { ArrowUp: step, ArrowDown: -step }[event.key] ?? 0;
    if (!d && !o) return;
    event.preventDefault();
    onMove({ distance: mm(clamp(obstacle.distance + d, distanceControl())), offset: mm(clamp(obstacle.offset + o, offsetControl())) });
  };

  // The cone, out to the drawing's edge.
  const far = Number(span) * 1.05;
  const spread = beamHalfWidth(beam, far);
  const face = { x: px(obstacle.distance), top: py(obstacle.offset + obstacle.width / 2), bottom: py(obstacle.offset - obstacle.width / 2) };
  const inBeam = echoOff({ ...beam, min: 0, max: Infinity }, obstacle) !== null;
  const where = `${formatQuantity(obstacle.distance, "length")} ahead, ${formatQuantity(Math.abs(obstacle.offset), "length")} ${obstacle.offset > 0 ? "to the left" : obstacle.offset < 0 ? "to the right" : "to the side"}`;

  return (
    <div className="mt-4" data-testid="obstacle-test">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] text-foreground">Obstacle test</p>
        <SegmentedControl
          value={span}
          onChange={setSpan}
          label="Distance shown"
          size="sm"
          options={[
            { id: "1", label: "1 m", description: "Show the first meter in front of the sensor" },
            { id: "4", label: "4 m", description: "Show the sensor's whole 4 m range" },
          ]}
        />
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none overflow-hidden rounded-[10px] border border-border bg-canvas"
        role="img"
        aria-label={`HC-SR04 seen from above, with an obstacle ${where}`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          place(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) place(e);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <line x1={X0} y1={CY} x2={W} y2={CY} stroke="var(--border)" strokeDasharray="2 4" />
        {TICKS[span].map(([d, label]) => (
          <g key={label}>
            <line x1={px(d)} y1={H - 14} x2={px(d)} y2={H - 10} stroke="var(--muted)" />
            <text x={px(d)} y={H - 3} textAnchor={d === Number(span) ? "end" : "middle"} fontSize={8} fill="var(--muted)">
              {label}
            </text>
          </g>
        ))}
        <path d={`M ${X0} ${CY} L ${px(far)} ${py(spread)} L ${px(far)} ${py(-spread)} Z`} fill="var(--primary)" fillOpacity={0.08} stroke="var(--primary)" strokeOpacity={0.3} />
        {echo ? <line x1={X0} y1={CY} x2={px(echo.at[0])} y2={py(echo.at[1])} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="4 3" data-testid="obstacle-echo" /> : null}
        <rect x={6} y={CY - 11} width={X0 - 6} height={22} rx={3} fill="var(--muted)" fillOpacity={0.35} stroke="var(--muted)" />
        <g
          role="slider"
          tabIndex={0}
          aria-label="Obstacle"
          aria-valuemin={distanceControl().min}
          aria-valuemax={distanceControl().max}
          aria-valuenow={obstacle.distance}
          aria-valuetext={where}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
          onKeyDown={key}
          className="cursor-grab outline-none focus-visible:[&>rect]:stroke-primary"
          data-testid="obstacle"
        >
          <rect x={face.x} y={face.top} width={8} height={Math.max(4, face.bottom - face.top)} rx={1.5} fill="var(--foreground)" fillOpacity={0.75} stroke="var(--foreground)" strokeWidth={1} />
        </g>
      </svg>
      <p className="mt-2 text-[12.5px] text-foreground" data-testid="obstacle-reading" aria-live="polite">
        {echo ? (
          <>
            Sensor reads <span className="font-mono font-semibold tabular-nums">{(echo.distance * 100).toFixed(1)} cm</span>
          </>
        ) : (
          <>No echo: the obstacle is {inBeam ? "beyond the sensor's 4 m" : "outside the beam"}.</>
        )}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-muted">{held ? "Drag the obstacle, or select it and use the arrow keys (Shift for 10 cm steps)." : "Showing the simulated sweep. Drag the obstacle to take over."}</p>
    </div>
  );
}
