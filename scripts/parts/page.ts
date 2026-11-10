/**
 * Runs in a headless browser for scripts/parts-sheet.mjs: draws parts with
 * the app's own WebGL renderer and returns PNG data URLs.
 */
import { modelBounds } from "@kiungo/core/parts/bounds";
import { dropBelow } from "@kiungo/core/parts/geometry";
import type { PartModel, PinRole } from "@kiungo/core/parts/types";
import { planImage, renderPart } from "@kiungo/lab/render3d/renderer";

const ROLE_COLOR: Record<PinRole, string> = {
  power: "#e5484d",
  ground: "#3a3f47",
  digital: "#0f8b8e",
  analog: "#2f9e5b",
  pwm: "#d9772b",
  data: "#7c5cd6",
  clock: "#7c5cd6",
  uart: "#7c5cd6",
  spi: "#7c5cd6",
  i2c: "#7c5cd6",
  mechanical: "#8b9199",
  other: "#8b9199",
};

const BACKGROUND = "#f3f5f7";

function fitScale(model: PartModel, pw: number, ph: number, tilt: number): number {
  const b = modelBounds(model);
  const diagonal = Math.hypot(Math.max(model.size.w, b.x2 - b.x1), Math.max(model.size.h, b.y2 - b.y1)) || 1;
  const rad = (tilt * Math.PI) / 180;
  const tall = diagonal * Math.cos(rad) + (model.size.d + dropBelow(model)) * Math.sin(rad);
  return 0.86 * Math.min(pw / diagonal, ph / Math.max(1, tall));
}

function view3d(model: PartModel, pw: number, ph: number, spin: number, tilt: number, powered: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  renderPart(model, canvas, { width: pw, height: ph, scale: fitScale(model, pw, ph, tilt), view: { spin, tilt }, powered, lit: powered ? (model.animate?.lit ?? []) : [], pixelRatio: 1, time: 0.4 });
  return canvas;
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

/** The top (or front) view with every placed pin marked, to check pins land on their pads. */
async function planPanel(g: CanvasRenderingContext2D, model: PartModel, x0: number, y0: number, pw: number, ph: number, marks: boolean): Promise<void> {
  const front = model.plan === "front";
  const b = modelBounds(model);
  const drop = dropBelow(model);
  const margin = Math.max(3, Math.max(model.size.w, model.size.h) * 0.18);
  const region = front
    ? { x: Math.min(0, b.x1) - margin, y: -margin, w: Math.max(model.size.w, b.x2) - Math.min(0, b.x1) + 2 * margin, h: model.size.d + drop + 2 * margin }
    : { x: Math.min(0, b.x1) - margin, y: Math.min(0, b.y1) - margin, w: Math.max(model.size.w, b.x2) - Math.min(0, b.x1) + 2 * margin, h: Math.max(model.size.h, b.y2) - Math.min(0, b.y1) + 2 * margin };
  const k = Math.min(pw / region.w, ph / region.h);
  const url = planImage(model, front ? "front" : "top", region, { pxPerMm: k, powered: false });
  const ox = x0 + (pw - region.w * k) / 2;
  const oy = y0 + (ph - region.h * k) / 2;
  if (url) g.drawImage(await load(url), ox, oy, region.w * k, region.h * k);
  if (!marks) return;
  const px = (x: number) => ox + (x - region.x) * k;
  const py = (y: number) => oy + (y - region.y) * k;
  g.save();
  g.setLineDash([4, 3]);
  g.lineWidth = 1;
  g.strokeStyle = "rgba(15,139,142,0.55)";
  for (const f of model.features) g.strokeRect(px(f.x), py(f.y), f.w * k, f.h * k);
  g.restore();
  g.font = "600 11px ui-monospace, monospace";
  g.textBaseline = "middle";
  const spots = model.pinSpots ?? [];
  spots.forEach((spot, i) => {
    const cx = px(spot.x);
    const cy = py(spot.y);
    g.beginPath();
    g.arc(cx, cy, 4, 0, Math.PI * 2);
    g.fillStyle = ROLE_COLOR[spot.role];
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = "#ffffff";
    g.stroke();
    // Labels alternate above and below so a 2.54 mm row stays readable.
    const up = i % 2 === 0;
    const text = spot.label;
    const tw = g.measureText(text).width + 6;
    const tx = Math.max(x0 + 2, Math.min(x0 + pw - tw - 2, cx - tw / 2));
    const ty = cy + (up ? -14 : 14);
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.fillRect(tx, ty - 7, tw, 14);
    g.fillStyle = "#11181c";
    g.fillText(text, tx + 3, ty);
  });
}

function caption(g: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  g.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "#5b6470";
  g.textBaseline = "top";
  g.fillText(text, x + 10, y + 8);
}

/** One part, four panels: two 3D views, the plan with pins marked, and a low view with the part powered. */
export async function drawPart(model: PartModel): Promise<string> {
  const W = 1500;
  const H = 1040;
  const top = 40;
  const pw = W / 2;
  const ph = (H - top) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#11181c";
  g.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  g.textBaseline = "middle";
  const spots = model.pinSpots?.length ?? 0;
  g.fillText(`${model.id}   ${model.name}   ${model.size.w} × ${model.size.h} × ${model.size.d} mm   ${model.solids.length} solids, ${spots} pins placed`, 12, top / 2);
  g.drawImage(view3d(model, pw, ph, -28, 56, false), 0, top);
  caption(g, "3D, front left", 0, top);
  g.drawImage(view3d(model, pw, ph, 152, 56, false), pw, top);
  caption(g, "3D, from behind", pw, top);
  await planPanel(g, model, 0, top + ph, pw, ph, true);
  caption(g, model.plan === "front" ? "2D (front), pins and features marked" : "2D (top), pins and features marked", 0, top + ph);
  g.drawImage(view3d(model, pw, ph, -40, 78, true), pw, top + ph);
  caption(g, "3D, low angle, powered", pw, top + ph);
  g.strokeStyle = "#d5dae0";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pw + 0.5, top);
  g.lineTo(pw + 0.5, H);
  g.moveTo(0, top + ph + 0.5);
  g.lineTo(W, top + ph + 0.5);
  g.stroke();
  return canvas.toDataURL("image/png");
}

/** Many parts on one page, a 3D view each, for reviewing a whole group at a glance. */
export async function drawSheet(models: PartModel[], columns = 5): Promise<string> {
  const cw = 360;
  const ch = 300;
  const rows = Math.ceil(models.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = cw * columns;
  canvas.height = ch * rows;
  const g = canvas.getContext("2d")!;
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, canvas.width, canvas.height);
  models.forEach((model, i) => {
    const x = (i % columns) * cw;
    const y = Math.floor(i / columns) * ch;
    g.drawImage(view3d(model, cw, ch - 30, -28, 56, true), x, y);
    g.fillStyle = "#11181c";
    g.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillText(model.name.length > 40 ? `${model.name.slice(0, 39)}…` : model.name, x + cw / 2, y + ch - 16);
    g.textAlign = "start";
    g.strokeStyle = "#d5dae0";
    g.strokeRect(x + 0.5, y + 0.5, cw, ch);
  });
  return canvas.toDataURL("image/png");
}
