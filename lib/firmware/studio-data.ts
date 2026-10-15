"use client";

/**
 * Data the Embedded Studio needs to open, loaded without blocking the page.
 *
 * The Kiungo API may take time to respond after being idle:
 * been idle: the first request can take tens of seconds. So the studio
 * paints at once from what it already knows (the last lists it saw in this
 * tab, and the built-in template list), and swaps in the server's answer
 * when it arrives.
 */

import { api } from "@/lib/api-client";
import { configureLocalMonaco } from "./monaco";

export type ProjectSummary = { project_id: string; name: string; board_type: string; project_type: string };
export type Template = { id: string; name: string };

/** The templates the backend ships (engine/firmware/project_templates.py), so New Project works before the server answers. */
export const BUILT_IN_TEMPLATES: Template[] = [
  { id: "blink", name: "Blink" },
  { id: "led", name: "LED Control" },
  { id: "servo", name: "Servo" },
  { id: "relay", name: "Relay" },
  { id: "dht11", name: "DHT11" },
  { id: "hc-sr04", name: "HC-SR04" },
  { id: "mq2", name: "MQ2" },
  { id: "lcd", name: "LCD" },
  { id: "i2c", name: "I2C Scanner" },
  { id: "spi", name: "SPI Loop" },
  { id: "wifi", name: "WiFi Connect" },
  { id: "bluetooth", name: "Bluetooth" },
  { id: "mqtt", name: "MQTT" },
];

export const BOARDS = ["esp32", "esp8266", "arduino-uno", "arduino-mega", "stm32", "raspberry-pi-pico", "raspberry-pi-4", "teensy", "nrf52", "microbit"] as const;

/** How long a request may take before the studio says the server is probably waking up. */
export const SLOW_AFTER_MS = 4000;
/** Allow time for an idle service to respond before reporting it as unreachable. */
export const REQUEST_TIMEOUT_MS = 60_000;

const CACHE_KEY = "hhip-firmware-studio:v1";

type Cache = { projects: ProjectSummary[]; templates: Template[]; savedAt: number };

export function readCache(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Cache>;
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.templates)) return null;
    return { projects: parsed.projects, templates: parsed.templates, savedAt: Number(parsed.savedAt) || 0 };
  } catch {
    return null;
  }
}

export function writeCache(next: Partial<Omit<Cache, "savedAt">>): void {
  if (typeof window === "undefined") return;
  try {
    const current = readCache() ?? { projects: [], templates: BUILT_IN_TEMPLATES, savedAt: 0 };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...current, ...next, savedAt: Date.now() }));
  } catch {
    // Storage blocked or full: the lists still show for this visit.
  }
}

/** The list only needs a name per project; the API sends every file's contents too. */
export function summarize(projects: Array<Record<string, unknown>>): ProjectSummary[] {
  return projects
    .filter((p) => typeof p.project_id === "string")
    .map((p) => ({
      project_id: String(p.project_id),
      name: String(p.name ?? "Untitled"),
      board_type: String(p.board_type ?? ""),
      project_type: String(p.project_type ?? ""),
    }));
}

export async function loadProjects(): Promise<ProjectSummary[]> {
  const res = await api.listFirmwareProjects(REQUEST_TIMEOUT_MS);
  const projects = summarize(res.projects ?? []);
  writeCache({ projects });
  return projects;
}

export async function loadTemplates(): Promise<Template[]> {
  const res = await api.listFirmwareTemplates(REQUEST_TIMEOUT_MS);
  const templates = (res.templates ?? [])
    .filter((t) => typeof t.id === "string" && typeof t.name === "string")
    .map((t) => ({ id: String(t.id), name: String(t.name) }));
  if (templates.length) writeCache({ templates });
  return templates.length ? templates : BUILT_IN_TEMPLATES;
}

let editorPreload: Promise<unknown> | null = null;
let guardInstalled = false;

/**
 * @monaco-editor/loader has a bug: when its script fails to load, it
 * surfaces the raw script "error" Event as an unhandled rejection besides
 * rejecting init(). The editor now comes from Kiungo itself (/monaco/vs), but
 * a failed download is still possible offline; turn it into one plain log line.
 */
function guardLoaderFailure(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as unknown;
    const target = reason instanceof Event ? (reason.target as { src?: string } | null) : null;
    if (reason instanceof Event && reason.type === "error" && /monaco/.test(target?.src ?? "")) {
      event.preventDefault();
      console.warn("Kiungo: the code editor could not be downloaded; a plain text editor will be used.");
    }
  });
}

/**
 * Fetch the code editor while the page is idle, so opening a project doesn't
 * wait for it. Monaco is several megabytes, served by Kiungo from
 * /monaco/vs; the download happens once per visit either way, so start it early.
 */
export function preloadEditor(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve();
  guardLoaderFailure();
  editorPreload ??= new Promise<void>((resolve) => {
    const start = () => resolve();
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(start, { timeout: 3000 });
    else window.setTimeout(start, 1500);
  })
    .then(() => import("@monaco-editor/react"))
    .then((m) => {
      configureLocalMonaco(m.loader);
      return m.loader.init();
    })
    .catch(() => {
      // No CDN or no module: the editor falls back to a plain text area when it's opened.
      editorPreload = null;
    });
  return editorPreload;
}
