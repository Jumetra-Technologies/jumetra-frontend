/**
 * The Home page's Blink scene: the real Arduino Uno R3 model in a small
 * three.js stage of its own, where a USB lead, a 220 Ω resistor and a red LED
 * pop in from the sides and plug into the board, the sketch uploads (TX/RX
 * flicker), and the LED blinks with the board's L LED.
 *
 * The build is electrically right: the resistor stands in pin 13, the LED's
 * short leg (cathode) goes into the GND socket beside it, and its long leg
 * (anode) is twisted onto the resistor's top lead. GND and 13 sit next to each
 * other on the Uno's top header, 2.54 mm apart, the LED's own leg spacing.
 *
 * World axes follow the lab renderer (render3d/scene.ts): x is the model's x,
 * y is the model's y flipped, z is up. Units are millimeters.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { dropBelow } from "@kiungo/core/parts/geometry";
import type { PartModel } from "@kiungo/core/parts/types";
import { buildPart, setLit, type PartObject } from "@kiungo/lab/render3d/scene";

export type BlinkPhase = "still" | "plugging" | "uploading" | "blinking" | "leaving";

/** The top of the Uno's socket headers (1.6 mm board + 8.5 mm socket). */
const HOLE_TOP = 10.1;
/** Hole centers on the top header (arduino-uno.ts: SCL SDA AREF GND 13 …, from x = 18.77). */
const GND_X = 26.39;
const PIN13_X = 28.93;
const HEADER_Y = -2.07;
/** The middle of the USB-B socket's mouth, on the board's left edge. */
const USB_MOUTH = new THREE.Vector3(-6.6, -13.8, 7.05);
/** Where the LED's anode meets the resistor's top lead. */
const JOIN_Z = 21.5;

/** The timeline, in seconds from Play. */
export const TIMING = {
  usb: [0.15, 1.05],
  resistor: [1.3, 2.05],
  led: [2.3, 3.05],
  upload: [3.25, 4.75],
  /** Blink: on for half a second, off for half a second, from here on. */
  blink: 4.75,
  /** Stop: everything leaves in this long. */
  leave: 0.75,
} as const;

const TEAL_FLASH = "#5fe0db";
const LED_RED = "#e0252b";

/* ----- Easing ---------------------------------------------------------------- */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOutBack = (t: number, s = 1.5) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const easeInBack = (t: number, s = 1.4) => (s + 1) * t ** 3 - s * t ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));

/* ----- Small textures ---------------------------------------------------------- */

function radialTexture(stops: Array<[number, string]>, size = 128): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ----- The three parts that plug in -------------------------------------------- */

interface Mover {
  group: THREE.Group;
  /** Where it rests once plugged in. */
  rest: THREE.Vector3;
  /** Where it comes from (and goes back to): an offset from rest, and a starting turn. */
  from: THREE.Vector3;
  turn: THREE.Euler;
  /** Where it was when Stop was pressed, so it leaves from there. */
  left?: { position: THREE.Vector3; quaternion: THREE.Quaternion };
}

function metal(color: string, roughness = 0.32) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness });
}

/** A straight round lead from a to b. */
function lead(a: THREE.Vector3, b: THREE.Vector3, material: THREE.Material, r = 0.28): THREE.Mesh {
  const length = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 10), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  mesh.castShadow = true;
  return mesh;
}

/** A lathe turned about the model's z axis (three's lathe turns about y). */
function upright(points: Array<[number, number]>, material: THREE.Material, segments = 28): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

/** The USB-B lead: a steel shell that goes into the socket, the gray overmold, the strain relief and the cable. */
function usbLead(): THREE.Group {
  const group = new THREE.Group();
  const plastic = new THREE.MeshStandardMaterial({ color: "#3b4048", roughness: 0.55, metalness: 0.05 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(8, 8.2, 7.6), metal("#c9ced4", 0.28));
  shell.position.set(4, 0, 0);
  const overmold = new THREE.Mesh(new RoundedBoxGeometry(19, 15.5, 13, 3, 2.2), plastic);
  overmold.position.set(-9.9, 0, 0);
  // A grip groove on each side.
  const groove = new THREE.MeshStandardMaterial({ color: "#2c3037", roughness: 0.7 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 9), groove);
      rib.position.set(-15.5 + i * 2.1, side * 7.8, 0);
      group.add(rib);
    }
  }
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.6, 9, 20), plastic);
  relief.rotation.z = Math.PI / 2;
  relief.position.set(-23.8, 0, -0.4);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-27.5, 0, -0.6),
    new THREE.Vector3(-42, 0, -2.5),
    new THREE.Vector3(-60, -4, -5.4),
    new THREE.Vector3(-85, -16, -5.6),
    new THREE.Vector3(-130, -34, -5.6),
    new THREE.Vector3(-200, -46, -5.6),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(path, 90, 2.3, 14), new THREE.MeshStandardMaterial({ color: "#2d3138", roughness: 0.62 }));
  for (const mesh of [shell, overmold, relief, cable]) {
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

/** A ¼ W 220 Ω resistor standing in pin 13: red, red, brown, gold. Origin at the hole's top. */
function resistor(): THREE.Group {
  const group = new THREE.Group();
  const tin = metal("#c8ccd0");
  const BODY = 2.4;
  const LENGTH = 6.3;
  group.add(lead(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, BODY + 0.3), tin));
  group.add(lead(new THREE.Vector3(0, 0, BODY + LENGTH - 0.3), new THREE.Vector3(0, 0, JOIN_Z - HOLE_TOP + 0.6), tin));
  const body = upright(
    [[0, 0], [0.75, 0], [1.22, 0.35], [1.32, 1.15], [1.12, 1.9], [1.06, 2.6], [1.06, 3.7], [1.12, 4.4], [1.32, 5.15], [1.22, 5.95], [0.75, LENGTH], [0, LENGTH]],
    new THREE.MeshStandardMaterial({ color: "#d9c49d", roughness: 0.55 }),
  );
  body.position.z = BODY;
  group.add(body);
  const bands: Array<[number, number, string]> = [
    [0.95, 1.36, "#c0272d"],
    [1.95, 1.13, "#c0272d"],
    [2.85, 1.1, "#6b3a1f"],
    [5.05, 1.36, "#c9a34a"],
  ];
  for (const [at, r, color] of bands) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 28), new THREE.MeshStandardMaterial({ color, roughness: color === "#c9a34a" ? 0.3 : 0.5, metalness: color === "#c9a34a" ? 0.7 : 0 }));
    band.rotation.x = Math.PI / 2;
    band.position.z = BODY + at;
    group.add(band);
  }
  return group;
}

/** A red 5 mm LED. Origin at the hole tops, halfway between GND and pin 13. */
function led(lens: THREE.MeshPhysicalMaterial): { group: THREE.Group; glowAt: THREE.Vector3 } {
  const group = new THREE.Group();
  const tin = metal("#c8ccd0");
  const half = (PIN13_X - GND_X) / 2;
  const base = 14;
  // Cathode (short leg) straight down into GND; anode down onto the resistor's top lead.
  group.add(lead(new THREE.Vector3(-half, 0, -5), new THREE.Vector3(-half, 0, base + 0.5), tin));
  group.add(lead(new THREE.Vector3(half, 0, JOIN_Z - HOLE_TOP - 0.8), new THREE.Vector3(half, 0, base + 0.5), tin));
  // The twist where the anode wraps the resistor's lead.
  for (let i = 0; i < 3; i++) {
    const turn = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.2, 8, 18), tin);
    turn.position.set(half, 0, JOIN_Z - HOLE_TOP - 0.5 + i * 0.48);
    turn.rotation.x = 0.25;
    group.add(turn);
  }
  const dome: Array<[number, number]> = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    dome.push([2.5 * Math.cos(a), 6.5 + 2.4 * Math.sin(a)]);
  }
  const body = upright([[0, 0], [2.95, 0], [2.95, 1], [2.5, 1], [2.5, 6.5], ...dome.slice(1)], lens, 36);
  body.position.z = base;
  group.add(body);
  return { group, glowAt: new THREE.Vector3(0, 0, base + 6.2) };
}

/* ----- The scene ------------------------------------------------------------------ */

export class BlinkScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(27, 1.25, 1, 2000);
  private readonly board: PartObject;
  private readonly usb: Mover;
  private readonly res: Mover;
  private readonly diode: Mover;
  private readonly lens: THREE.MeshPhysicalMaterial;
  private readonly glow: THREE.Sprite;
  private readonly lamp: THREE.PointLight;
  private readonly flashes: Array<{ sprite: THREE.Sprite; at: number }> = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private litKey = "";
  private phase: BlinkPhase = "still";
  private started = 0;
  private stopped = 0;
  /** How far the camera has moved towards the close-up (0 to 1), and where it was when Stop was pressed. */
  private closeUp = 0;
  private closeUpAtStop = 0;
  private reduce = false;
  onPhase?: (phase: BlinkPhase) => void;

  constructor(canvas: HTMLCanvasElement, uno: PartModel) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.45;
    this.disposables.push(environment);

    const key = new THREE.DirectionalLight(0xfff6ec, 2.1);
    key.position.set(-40, 30, 160);
    key.target.position.set(30, -26, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 400 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 5;
    this.scene.add(key, key.target, new THREE.HemisphereLight(0xffffff, 0x63707a, 0.35));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.2 }));
    ground.position.set(30, -26, -dropBelow(uno) - 0.05);
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.board = buildPart(uno);
    this.board.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.scene.add(this.board.root);

    this.lens = new THREE.MeshPhysicalMaterial({ color: LED_RED, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.9, emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0 });

    const usb = usbLead();
    this.usb = { group: usb, rest: USB_MOUTH.clone(), from: new THREE.Vector3(-170, 0, 0), turn: new THREE.Euler(0, 0, 0) };
    const r = resistor();
    this.res = { group: r, rest: new THREE.Vector3(PIN13_X, HEADER_Y, HOLE_TOP), from: new THREE.Vector3(95, 30, 70), turn: new THREE.Euler(0.4, -1.6, 2.4) };
    const { group: d, glowAt } = led(this.lens);
    this.diode = { group: d, rest: new THREE.Vector3((GND_X + PIN13_X) / 2, HEADER_Y, HOLE_TOP), from: new THREE.Vector3(70, -40, 95), turn: new THREE.Euler(1.3, 0.3, -1.7) };

    const glowTexture = radialTexture([[0, "rgba(255,90,70,1)"], [0.25, "rgba(255,40,30,0.55)"], [1, "rgba(255,0,0,0)"]]);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.glow.scale.setScalar(30);
    this.glow.position.copy(glowAt);
    this.glow.renderOrder = 20;
    d.add(this.glow);
    this.lamp = new THREE.PointLight("#ff3020", 0, 26, 2);
    this.lamp.position.copy(glowAt);
    d.add(this.lamp);
    this.disposables.push(glowTexture);

    for (const mover of [this.usb, this.res, this.diode]) {
      mover.group.visible = false;
      this.scene.add(mover.group);
    }

    const ring = radialTexture([[0, "rgba(95,224,219,0)"], [0.58, "rgba(95,224,219,0)"], [0.7, "rgba(160,245,240,1)"], [0.82, "rgba(95,224,219,0.5)"], [1, "rgba(95,224,219,0)"]]);
    this.disposables.push(ring);
    const flashAt = [USB_MOUTH.clone().add(new THREE.Vector3(-1, 0, 0)), new THREE.Vector3(PIN13_X, HEADER_Y, HOLE_TOP + 0.3), new THREE.Vector3(GND_X, HEADER_Y, HOLE_TOP + 0.3)];
    const flashTimes = [TIMING.usb[1], TIMING.resistor[1], TIMING.led[1]];
    flashAt.forEach((at, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ring, color: TEAL_FLASH, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      sprite.position.copy(at);
      sprite.renderOrder = 30;
      this.scene.add(sprite);
      this.flashes.push({ sprite, at: flashTimes[i] });
    });

    this.pose(0, 0);
  }

  /** Size in CSS px. */
  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(Math.min(2, ratio));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  get current(): BlinkPhase {
    return this.phase;
  }

  /** Whether frames still change (so the caller keeps its animation loop going). */
  get animating(): boolean {
    return this.phase !== "still";
  }

  play(now: number, reduce: boolean): void {
    this.reduce = reduce;
    this.started = now - (reduce ? TIMING.upload[0] : 0);
    for (const mover of [this.usb, this.res, this.diode]) mover.left = undefined;
    this.setPhase("plugging");
  }

  stop(now: number): void {
    if (this.phase === "still" || this.phase === "leaving") return;
    this.stopped = now;
    this.closeUpAtStop = this.closeUp;
    for (const mover of [this.usb, this.res, this.diode]) mover.left = { position: mover.group.position.clone(), quaternion: mover.group.quaternion.clone() };
    this.setPhase(this.reduce ? "still" : "leaving");
    if (this.reduce) this.reset();
  }

  private setPhase(phase: BlinkPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.onPhase?.(phase);
  }

  private reset(): void {
    for (const mover of [this.usb, this.res, this.diode]) {
      mover.group.visible = false;
      mover.left = undefined;
    }
    this.closeUp = 0;
    this.light(false, false, false, false);
  }

  /** Camera: the still three-quarter view (k = 0) or the close-up on the build (k = 1), with a slow sway while it runs. */
  private pose(k: number, sway: number): void {
    const target = new THREE.Vector3().lerpVectors(new THREE.Vector3(32, -25, 3), new THREE.Vector3(27, -20, 9), k);
    const offset = new THREE.Vector3().lerpVectors(new THREE.Vector3(-64, -132, 108), new THREE.Vector3(-104, -118, 100), k);
    offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), sway);
    this.camera.position.copy(target).add(offset);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(target);
  }

  private light(on: boolean, l: boolean, tx: boolean, rx: boolean): void {
    const ids = [on && "led-on", l && "led-l", tx && "led-tx", rx && "led-rx"].filter(Boolean) as string[];
    const key = ids.join("|");
    if (key === this.litKey) return;
    this.litKey = key;
    setLit(this.board, new Set(ids));
  }

  private place(mover: Mover, arrival: number): void {
    mover.group.visible = arrival > 0;
    const e = mover === this.usb ? 1 - (1 - arrival) ** 3 : easeOutBack(arrival);
    mover.group.position.copy(mover.rest).addScaledVector(mover.from, 1 - e);
    const turn = new THREE.Quaternion().setFromEuler(mover.turn);
    mover.group.quaternion.identity().slerp(turn, 1 - clamp01(e));
    const pop = mover === this.usb ? 1 : 0.55 + 0.45 * clamp01(arrival * 1.6);
    mover.group.scale.setScalar(pop);
  }

  private setLed(on: boolean): void {
    this.lens.emissiveIntensity = on ? 2.6 : 0;
    this.lens.opacity = on ? 0.97 : 0.9;
    (this.glow.material as THREE.SpriteMaterial).opacity = on ? 0.95 : 0;
    this.lamp.intensity = on ? 160 : 0;
  }

  /** Advance to `now` (seconds) and draw. */
  frame(now: number): void {
    if (this.phase === "leaving") {
      const t = clamp01((now - this.stopped) / TIMING.leave);
      for (const mover of [this.usb, this.res, this.diode]) {
        if (!mover.left || !mover.group.visible) continue;
        const e = easeInBack(t);
        const out = mover.rest.clone().add(mover.from);
        mover.group.position.lerpVectors(mover.left.position, out, e);
        mover.group.quaternion.copy(mover.left.quaternion).slerp(new THREE.Quaternion().setFromEuler(mover.turn), e);
      }
      this.light(false, false, false, false);
      this.setLed(false);
      this.closeUp = this.closeUpAtStop * (1 - easeInOut(clamp01((now - this.stopped) / (TIMING.leave + 0.35))));
      this.pose(this.closeUp, 0);
      for (const flash of this.flashes) (flash.sprite.material as THREE.SpriteMaterial).opacity = 0;
      if (now - this.stopped >= TIMING.leave + 0.35) {
        this.reset();
        this.pose(0, 0);
        this.setPhase("still");
      }
    } else if (this.phase !== "still") {
      const t = now - this.started;
      this.place(this.usb, span(t, TIMING.usb));
      this.place(this.res, span(t, TIMING.resistor));
      this.place(this.diode, span(t, TIMING.led));

      const powered = t >= TIMING.usb[1];
      const uploading = t >= TIMING.upload[0] && t < TIMING.upload[1];
      const blinking = t >= TIMING.blink;
      const fast = Math.floor(t / 0.07) % 2 === 0;
      const on = blinking && Math.floor((t - TIMING.blink) / 0.5) % 2 === 0;
      // While the sketch uploads, the bootloader flickers L and the bridge flickers TX and RX.
      this.light(powered, uploading ? fast : on, uploading && fast, uploading && !fast);
      this.setLed(on);
      this.setPhase(blinking ? "blinking" : uploading ? "uploading" : "plugging");

      for (const flash of this.flashes) {
        const f = (t - flash.at) / 0.45;
        const material = flash.sprite.material as THREE.SpriteMaterial;
        material.opacity = f >= 0 && f <= 1 && !this.reduce ? (1 - f) ** 1.5 : 0;
        flash.sprite.scale.setScalar(4 + 16 * clamp01(f));
      }

      this.closeUp = this.reduce ? 1 : easeInOut(clamp01(t / TIMING.led[1]));
      const sway = this.reduce || !blinking ? 0 : Math.sin((t - TIMING.blink) * 0.55) * 0.06;
      this.pose(this.closeUp, sway);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.board.dispose();
    for (const d of this.disposables) d.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && !this.board.root.getObjectById(mesh.id)) mesh.geometry.dispose();
    });
    this.renderer.dispose();
  }
}
