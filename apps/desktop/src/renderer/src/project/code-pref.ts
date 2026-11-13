/**
 * Whether the code pane shows beside the circuit, and how much of the width
 * it takes: remembered on this computer (C1).
 *
 * The code is an equal half by default. Until 0.13.12 the default was 0.42;
 * a stored 0.42 from before then is that old default, not a choice, so it
 * moves to 0.5 once. Any other stored width was the person's choice and stays.
 */

export const CODE_PREF = "kiungo.desktop.code";
/** Where the stored preference is up to: 2 is the one with the half-width default. */
export const CODE_PREF_VERSION = 2;

export const CODE_WIDTH = {
  default: 0.5,
  /** The default before C1. */
  previous: 0.42,
  min: 0.25,
  max: 0.7,
  /** One arrow-key press on the divider. */
  step: 0.03,
} as const;

export interface CodePref {
  open: boolean;
  /** The code's share of the width, 0.25 to 0.70. */
  width: number;
}

export const clampCodeWidth = (width: number): number => Math.min(CODE_WIDTH.max, Math.max(CODE_WIDTH.min, width));

/** Read the stored preference, moving the old default to the new one. Never throws. */
export function readCodePref(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): CodePref {
  try {
    const raw = JSON.parse(storage?.getItem(CODE_PREF) ?? "null") as { open?: unknown; width?: unknown; v?: unknown } | null;
    const open = raw?.open !== false;
    if (typeof raw?.width !== "number" || !Number.isFinite(raw.width)) return { open, width: CODE_WIDTH.default };
    const stillOldDefault = raw.v !== CODE_PREF_VERSION && raw.width === CODE_WIDTH.previous;
    return { open, width: stillOldDefault ? CODE_WIDTH.default : clampCodeWidth(raw.width) };
  } catch {
    return { open: true, width: CODE_WIDTH.default };
  }
}

export function writeCodePref(pref: CodePref, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(CODE_PREF, JSON.stringify({ open: pref.open, width: pref.width, v: CODE_PREF_VERSION }));
  } catch {
    /* only a convenience */
  }
}
