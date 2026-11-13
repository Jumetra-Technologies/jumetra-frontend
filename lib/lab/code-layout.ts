/**
 * Where the code pane sits, per lab session, in this browser: open or closed,
 * and its share of the width. Open at an even split by default (B7: code is
 * as important as the circuit), resizable from 25 % to 70 %.
 */

export interface CodeLayout {
  open: boolean;
  /** The code pane's share of the width. */
  ratio: number;
}

export const CODE_LAYOUT_KEY = "kiungo.lab.code-layout";
export const DEFAULT_CODE_LAYOUT: CodeLayout = { open: true, ratio: 0.5 };
export const MIN_CODE_RATIO = 0.25;
export const MAX_CODE_RATIO = 0.7;
/** How far one arrow key moves the divider. */
export const CODE_RATIO_STEP = 0.03;
const MAX_REMEMBERED = 50;

export const clampRatio = (ratio: number) => Math.min(MAX_CODE_RATIO, Math.max(MIN_CODE_RATIO, Number.isFinite(ratio) ? ratio : DEFAULT_CODE_LAYOUT.ratio));

function readAll(): Record<string, CodeLayout> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CODE_LAYOUT_KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function readCodeLayout(sessionId: string): CodeLayout {
  const saved = readAll()[sessionId];
  if (!saved || typeof saved !== "object") return DEFAULT_CODE_LAYOUT;
  return { open: typeof saved.open === "boolean" ? saved.open : DEFAULT_CODE_LAYOUT.open, ratio: clampRatio(Number(saved.ratio)) };
}

export function writeCodeLayout(sessionId: string, layout: CodeLayout): void {
  try {
    const all = readAll();
    delete all[sessionId];
    // Newest last; keep the most recent sessions only.
    const entries = [...Object.entries(all), [sessionId, { open: layout.open, ratio: clampRatio(layout.ratio) }] as const].slice(-MAX_REMEMBERED);
    window.localStorage.setItem(CODE_LAYOUT_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage blocked or full: the layout just isn't remembered.
  }
}
