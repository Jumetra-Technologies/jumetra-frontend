"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { flatColor, shade } from "@/lib/parts/build";
import type { PartModel, Solid } from "@/lib/parts/types";
import { useTurntable } from "@/lib/ui/use-turntable";
import { cn } from "@/lib/utils";
import styles from "./part-model.module.css";

const MAX_SCALE = 40;

const TILT = 56;
const SIN_TILT = Math.sin((TILT * Math.PI) / 180);

/** How far the part reaches below its base plane: hanging pins and legs. */
function dropBelow(model: PartModel): number {
  let below = 0;
  for (const solid of model.solids) {
    if (solid.kind === "pins" && solid.len < 0) below = Math.max(below, -((solid.z ?? 0) + solid.len));
    else if ((solid.kind === "box" || solid.kind === "cyl") && (solid.z ?? 0) < 0) below = Math.max(below, -(solid.z ?? 0));
  }
  return below;
}

/** Pixels per millimetre so the part, turned to any angle, fits the stage. */
function fitScale(width: number, height: number, model: PartModel): number {
  const diagonal = Math.hypot(model.size.w, model.size.h) || 1;
  const byWidth = (width * 0.9) / diagonal;
  const byHeight = (height * 0.94) / (diagonal * 0.58 + (model.size.d + dropBelow(model)) * SIN_TILT);
  return Math.max(2, Math.min(MAX_SCALE, byWidth, byHeight));
}

function surfaceHeight(model: PartModel): number {
  const board = model.solids.find((solid) => solid.kind === "box" && solid.id === "pcb");
  return board && board.kind === "box" ? (board.z ?? 0) + board.d : 0;
}

function Box({ solid, s, lit, motion }: { solid: Extract<Solid, { kind: "box" }>; s: number; lit: boolean; motion?: "spin" | "sweep" }) {
  const side = solid.side ?? shade(flatColor(solid.top), 0.72);
  const base = `translateZ(${(((solid.z ?? 0) + solid.d / 2) * s).toFixed(2)}px)`;
  const style = {
    left: solid.x * s,
    top: solid.y * s,
    "--bw": `${solid.w * s}px`,
    "--bh": `${solid.h * s}px`,
    "--bz": `${solid.d * s}px`,
    "--top": solid.top,
    "--side": side,
    "--br": `${(solid.radius ?? 0.3) * s}px`,
    "--base": base,
    "--glow": solid.glow ?? "transparent",
    "--glowSize": `${Math.max(8, Math.min(28, solid.w * s * 0.9))}px`,
    transform: base,
  } as CSSProperties;
  const holes = solid.holes;
  const label = solid.label;

  return (
    <div className={cn(styles.box, lit && solid.glow && styles.lit, motion && styles[motion])} style={style} data-solid={solid.id}>
      <div className={`${styles.face} ${styles.boxTop}`}>
        {holes ? (
          <div
            className={styles.holes}
            style={{
              gridTemplateColumns: `repeat(${solid.w >= solid.h ? holes.count : holes.rows ?? 1}, 1fr)`,
              gridTemplateRows: `repeat(${solid.w >= solid.h ? holes.rows ?? 1 : holes.count}, 1fr)`,
            }}
          >
            {Array.from({ length: holes.count * (holes.rows ?? 1) }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        ) : null}
        {label ? (
          <span className={styles.boxLabel} style={{ color: label.color ?? "#a3a7ad", fontSize: (label.size ?? 1.5) * s }}>
            {label.text}
          </span>
        ) : null}
      </div>
      <div className={`${styles.face} ${styles.boxRight}`} />
      <div className={`${styles.face} ${styles.boxLeft}`} />
      <div className={`${styles.face} ${styles.boxFront}`} />
      <div className={`${styles.face} ${styles.boxBack}`} />
    </div>
  );
}

function Cylinder({ solid, s, lit, motion }: { solid: Extract<Solid, { kind: "cyl" }>; s: number; lit: boolean; motion?: "spin" | "sweep" }) {
  const n = solid.segments ?? Math.max(8, Math.min(24, Math.round((solid.r * s) / 5)));
  const side = solid.side ?? shade(flatColor(solid.top), 0.72);
  const apothem = solid.r * s * Math.cos(Math.PI / n);
  const faceWidth = 2 * solid.r * s * Math.sin(Math.PI / n) + 0.6;
  const base = `translateZ(${((solid.z ?? 0) * s).toFixed(2)}px)`;
  const style = {
    left: (solid.cx - solid.r) * s,
    top: (solid.cy - solid.r) * s,
    "--cw": `${solid.r * 2 * s}px`,
    "--ch": `${solid.d * s}px`,
    "--fw": `${faceWidth}px`,
    "--ap": `${apothem}px`,
    "--top": solid.top,
    "--side": side,
    "--base": base,
    "--glow": solid.glow ?? "transparent",
    "--glowSize": `${Math.max(8, Math.min(28, solid.r * s * 1.4))}px`,
    transform: base,
  } as CSSProperties;

  return (
    <div className={cn(styles.cyl, lit && solid.glow && styles.lit, motion && styles[motion])} style={style} data-solid={solid.id}>
      {Array.from({ length: n }, (_, i) => {
        const angle = (360 / n) * i;
        // Light from the front-left: faces turned away get darker.
        const shadeFactor = 0.78 + 0.22 * Math.cos(((angle - 150) * Math.PI) / 180);
        return (
          <div
            key={i}
            className={`${styles.face} ${styles.cylSide}`}
            style={{ "--a": `${angle}deg`, filter: `brightness(${shadeFactor.toFixed(2)})` } as CSSProperties}
          />
        );
      })}
      <div className={`${styles.face} ${styles.cylTop}`} />
    </div>
  );
}

function Dome({ solid, s, lit }: { solid: Extract<Solid, { kind: "dome" }>; s: number; lit: boolean }) {
  const steps = Math.max(5, Math.min(22, Math.round((solid.r * s) / 6)));
  const layers = Array.from({ length: steps }, (_, i) => {
    const phi = ((i + 1) / steps) * (Math.PI / 2);
    const radius = solid.r * Math.cos(phi - Math.PI / (2 * steps));
    const z = (solid.z ?? 0) + solid.d * Math.sin(phi);
    const zBelow = (solid.z ?? 0) + solid.d * Math.sin(phi - Math.PI / (2 * steps));
    return { radius, z, zBelow, i };
  });
  const color = solid.clear ? `color-mix(in srgb, ${solid.color} 55%, white)` : solid.color;
  const glow = solid.glow ?? solid.color;

  return (
    <div
      className={cn(styles.cyl, lit && styles.lit)}
      style={
        {
          left: (solid.cx - solid.r) * s,
          top: (solid.cy - solid.r) * s,
          "--cw": `${solid.r * 2 * s}px`,
          "--glow": glow,
          "--glowSize": `${Math.max(8, Math.min(24, solid.r * s))}px`,
        } as CSSProperties
      }
      data-solid={solid.id}
    >
      {layers.map(({ radius, z, zBelow, i }) => {
        const n = 14;
        const apothem = radius * s * Math.cos(Math.PI / n);
        const faceWidth = 2 * radius * s * Math.sin(Math.PI / n) + 0.6;
        const height = Math.max(0.5, (z - zBelow) * s);
        const shadeTop = shade(color.startsWith("#") ? color : solid.color, 0.95 + 0.25 * (i / steps));
        return (
          <div key={i} className={styles.cyl} style={{ inset: 0, width: "100%", height: "100%", position: "absolute" }}>
            {Array.from({ length: n }, (_, k) => {
              const angle = (360 / n) * k;
              const factor = 0.8 + 0.2 * Math.cos(((angle - 150) * Math.PI) / 180);
              return (
                <div
                  key={k}
                  className={`${styles.face} ${styles.cylSide}`}
                  style={
                    {
                      left: `calc(50% - ${faceWidth / 2}px)`,
                      top: `calc(50% - ${height / 2}px)`,
                      width: faceWidth,
                      height,
                      background: shade(solid.color, 0.75),
                      opacity: solid.clear ? 0.5 : 1,
                      filter: `brightness(${factor.toFixed(2)})`,
                      transform: `translateZ(${(zBelow * s + height / 2).toFixed(2)}px) rotateZ(${angle}deg) translateY(${-apothem}px) rotateX(90deg)`,
                    } as CSSProperties
                  }
                />
              );
            })}
            <div
              className={`${styles.face} ${styles.domeDisc}`}
              style={{
                left: `calc(50% - ${radius * s}px)`,
                top: `calc(50% - ${radius * s}px)`,
                width: radius * 2 * s,
                height: radius * 2 * s,
                background: `radial-gradient(circle at 35% 35%, ${shade(shadeTop, 1.25)}, ${shadeTop} 60%, ${shade(shadeTop, 0.8)})`,
                opacity: solid.clear ? 0.6 : 1,
                transform: `translateZ(${(z * s).toFixed(2)}px)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Pins({ solid, s }: { solid: Extract<Solid, { kind: "pins" }>; s: number }) {
  const rows = solid.rows ?? 1;
  const size = (solid.size ?? 0.64) * s;
  const color = solid.color ?? "#b8bcc2";
  const z = solid.z ?? 0;
  const pins: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < solid.count; i++) {
      const along = (i + 0.5) * solid.pitch;
      const across = (r + 0.5) * solid.pitch;
      pins.push(solid.dir === "x" ? { x: solid.x + along, y: solid.y + across } : { x: solid.x + across, y: solid.y + along });
    }
  }
  return (
    <>
      {pins.map((pin, i) => {
        const style = {
          "--px": `${pin.x * s}px`,
          "--py": `${pin.y * s}px`,
          "--pw": `${size}px`,
          "--pl": `${Math.abs(solid.len) * s}px`,
          "--pz": `${((z + solid.len / 2) * s).toFixed(2)}px`,
          "--pc": color,
        } as CSSProperties;
        // No wrapper element: anything without preserve-3d would flatten the pins into the base plane.
        return (
          <Fragment key={i}>
            <i className={`${styles.pin} ${styles.pinA}`} style={style} />
            <i className={`${styles.pin} ${styles.pinB}`} style={style} />
          </Fragment>
        );
      })}
    </>
  );
}

type Flat = Extract<Solid, { kind: "text" | "path" | "disc" }>;

/** Silkscreen, traces and pads: one SVG layer per height they sit at. */
function Surfaces({ model, s, surface }: { model: PartModel; s: number; surface: number }) {
  const layers = new Map<number, Flat[]>();
  for (const solid of model.solids) {
    if (solid.kind !== "text" && solid.kind !== "path" && solid.kind !== "disc") continue;
    const z = solid.z ?? surface;
    const layer = layers.get(z);
    if (layer) layer.push(solid);
    else layers.set(z, [solid]);
  }
  return (
    <>
      {[...layers.entries()].map(([z, flats]) => (
        <Surface key={z} model={model} s={s} z={z} flats={flats} />
      ))}
    </>
  );
}

function Surface({ model, s, z, flats }: { model: PartModel; s: number; z: number; flats: Flat[] }) {
  return (
    <svg
      className={styles.surface}
      viewBox={`0 0 ${model.size.w} ${model.size.h}`}
      width={model.size.w * s}
      height={model.size.h * s}
      style={{ transform: `translateZ(${(z * s + 0.3).toFixed(2)}px)`, overflow: "visible" }}
      aria-hidden
    >
      {flats.map((solid, i) => {
        if (solid.kind === "text") {
          return (
            <text
              key={i}
              x={solid.x}
              y={solid.y}
              fontSize={solid.size}
              fontWeight={solid.weight ?? 500}
              fill={solid.color ?? "#e9f1ec"}
              textAnchor={solid.anchor ?? "start"}
              fontFamily="var(--font-jetbrains), ui-monospace, monospace"
              transform={solid.rotate ? `rotate(${solid.rotate} ${solid.x} ${solid.y})` : undefined}
            >
              {solid.text}
            </text>
          );
        }
        if (solid.kind === "path") {
          return <path key={i} d={solid.d} fill={solid.fill ?? "none"} stroke={solid.color ?? "#2f8f73"} strokeWidth={solid.width ?? 0.3} strokeLinecap="round" strokeLinejoin="round" />;
        }
        return (
          <g key={i}>
            {solid.ring ? <circle cx={solid.cx} cy={solid.cy} r={solid.r + solid.ring.width} fill={solid.ring.color} /> : null}
            <circle cx={solid.cx} cy={solid.cy} r={solid.r} fill={solid.color} />
          </g>
        );
      })}
    </svg>
  );
}

export function PartModel3D({ model, powered, className }: { model: PartModel; powered: boolean; className?: string }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => fitScale(520, 360, model));
  useTurntable(sceneRef, { spin: -24, tilt: TILT, speed: 9 });

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const measure = () => setScale(fitScale(scene.clientWidth || 520, scene.clientHeight || 360, model));
    measure();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, [model]);

  const s = scale;
  const surface = surfaceHeight(model);
  const lit = new Set(powered ? model.animate?.lit ?? [] : []);
  const spin = new Set(powered ? model.animate?.spin ?? [] : []);
  const sweep = new Set(powered ? model.animate?.sweep ?? [] : []);
  const motionFor = (id?: string) => (id && spin.has(id) ? "spin" : id && sweep.has(id) ? "sweep" : undefined);
  // Put the middle of the part, not its base plane, at the middle of the stage.
  const lift = ((model.size.d - dropBelow(model)) / 2) * SIN_TILT * s;

  return (
    <div
      ref={sceneRef}
      className={cn(styles.scene, className)}
      role="group"
      aria-roledescription="interactive 3D model"
      aria-label={`${model.name}, turning slowly. Drag or use the arrow keys to turn it.`}
      tabIndex={0}
      data-testid="part-3d"
    >
      <div className={styles.stage} style={{ width: model.size.w * s, height: model.size.h * s, top: `calc(50% + ${lift.toFixed(1)}px)` }}>
        <div className={styles.shadow} aria-hidden />
        {model.solids.map((solid, i) => {
          switch (solid.kind) {
            case "box":
              return <Box key={`${solid.id ?? "s"}-${i}`} solid={solid} s={s} lit={lit.has(solid.id ?? "")} motion={motionFor(solid.id)} />;
            case "cyl":
              return <Cylinder key={`${solid.id ?? "s"}-${i}`} solid={solid} s={s} lit={lit.has(solid.id ?? "")} motion={motionFor(solid.id)} />;
            case "dome":
              return <Dome key={`${solid.id ?? "s"}-${i}`} solid={solid} s={s} lit={lit.has(solid.id ?? "")} />;
            case "pins":
              return <Pins key={`${solid.id ?? "s"}-${i}`} solid={solid} s={s} />;
            default:
              return null;
          }
        })}
        <Surfaces model={model} s={s} surface={surface} />
      </div>
    </div>
  );
}
