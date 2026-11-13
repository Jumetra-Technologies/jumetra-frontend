/**
 * Physical quantities in the lab, in SI.
 *
 * Every number a person sets on a part is stored in its quantity's SI unit
 * (ohms, meters, lux, pascals, hertz, radians, seconds, volts, amperes,
 * watts; ratios as plain fractions) and shown with an SI prefix: 4.7 kΩ,
 * 300 mm, 101.3 kPa. A few units SI accepts are shown instead of the
 * coherent one, as agreed (decision D-2): degrees for angles (stored in
 * radians), degrees Celsius for temperature (an SI derived unit), percent
 * for ratios and ppm for amount fractions.
 *
 * `formatQuantity` writes a value; `parseQuantity` reads what a person
 * typed, with or without a prefix and symbol ("4.7k", "4k7", "4700",
 * "4.7 kΩ", "10M", "300 mm", "45°").
 */

export type Quantity =
  | "resistance"
  | "length"
  | "illuminance"
  | "temperature"
  | "pressure"
  | "frequency"
  | "angle"
  | "ratio"
  | "amount"
  | "time"
  | "voltage"
  | "current"
  | "power"
  | "angular-speed"
  | "count";

interface QuantitySpec {
  /** The unit values are stored in. */
  si: string;
  /** The unit shown: the SI one, or an accepted one (`factor` converts stored → shown). */
  symbol: string;
  factor: number;
  /** SI prefixes the display may use, smallest first ("" is none). Empty: never prefixed. */
  prefixes: string[];
  /** Other ways to write the unit when typing it. */
  aliases?: string[];
  /** A note for a tooltip: the coherent SI unit when the shown one isn't it. */
  note?: string;
  /** The prefix a bare number is read with (pressure is typed in hPa, as it's shown). */
  bare?: string;
}

const PREFIX: Record<string, number> = { p: 1e-12, n: 1e-9, µ: 1e-6, u: 1e-6, m: 1e-3, "": 1, h: 1e2, k: 1e3, M: 1e6, G: 1e9 };

export const QUANTITIES: Record<Quantity, QuantitySpec> = {
  resistance: { si: "Ω", symbol: "Ω", factor: 1, prefixes: ["", "k", "M"], aliases: ["ohm", "ohms", "r"] },
  length: { si: "m", symbol: "m", factor: 1, prefixes: ["m", ""], aliases: ["meter", "meters", "metre", "metres"] },
  illuminance: { si: "lx", symbol: "lx", factor: 1, prefixes: ["", "k"], aliases: ["lux"] },
  temperature: { si: "°C", symbol: "°C", factor: 1, prefixes: [], aliases: ["c", "degc"], note: "Degrees Celsius; add 273.15 for kelvins." },
  pressure: { si: "Pa", symbol: "Pa", factor: 1, prefixes: ["h"], aliases: ["pascal", "pascals"], bare: "h" },
  frequency: { si: "Hz", symbol: "Hz", factor: 1, prefixes: ["", "k"], aliases: ["hertz", "/s", "steps/s"] },
  angle: { si: "rad", symbol: "°", factor: 180 / Math.PI, prefixes: [], aliases: ["deg", "degrees"], note: "Stored in radians, the SI unit; shown in degrees." },
  ratio: { si: "1", symbol: "%", factor: 100, prefixes: [], aliases: ["percent"] },
  amount: { si: "1", symbol: "ppm", factor: 1e6, prefixes: [] },
  time: { si: "s", symbol: "s", factor: 1, prefixes: ["m", ""], aliases: ["sec", "secs", "second", "seconds"] },
  voltage: { si: "V", symbol: "V", factor: 1, prefixes: ["m", ""], aliases: ["volt", "volts"] },
  current: { si: "A", symbol: "A", factor: 1, prefixes: ["µ", "m", ""], aliases: ["amp", "amps"] },
  power: { si: "W", symbol: "W", factor: 1, prefixes: ["m", ""], aliases: ["watt", "watts"] },
  "angular-speed": { si: "rad/s", symbol: "rad/s", factor: 1, prefixes: [], note: "Radians per second; × 9.549 for rpm." },
  count: { si: "", symbol: "", factor: 1, prefixes: [] },
};

/** Significant digits shown, trailing zeros dropped: 4.70 → "4.7". */
function trim(n: number, digits: number): string {
  if (n === 0) return "0";
  const fixed = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(n))));
  return Number(n.toFixed(Math.min(fixed, 6))).toString();
}

/** The prefix a value is shown with: the largest whose mantissa is at least 1. */
function prefixFor(abs: number, prefixes: string[]): string {
  if (!prefixes.length) return "";
  let chosen = prefixes[0];
  for (const p of prefixes) if (abs >= PREFIX[p] * 0.9995) chosen = p;
  return chosen;
}

/** "4.7 kΩ", "300 mm", "1013.2 hPa", "45°", "55 %", "0.5 s". */
export function formatQuantity(value: number, quantity: Quantity, digits = 3): string {
  const q = QUANTITIES[quantity];
  if (!Number.isFinite(value)) return "—";
  const shown = value * q.factor;
  const prefix = prefixFor(Math.abs(shown), q.prefixes);
  const mantissa = shown / PREFIX[prefix];
  // Pressure in hPa reads to a tenth (1013.2 hPa); everything else to `digits` significant digits.
  const text = quantity === "pressure" ? Number(mantissa.toFixed(1)).toString() : trim(mantissa, digits);
  const unit = `${prefix}${q.symbol}`;
  if (!unit) return text;
  return q.symbol === "°" ? `${text}°` : `${text} ${unit}`;
}

/** The value in the unit it's shown in (degrees, %, ppm): for sliders and ranges. */
export const toShown = (value: number, quantity: Quantity) => value * QUANTITIES[quantity].factor;
export const fromShown = (shown: number, quantity: Quantity) => shown / QUANTITIES[quantity].factor;

export type Parsed = { ok: true; value: number } | { ok: false; error: string };

/**
 * Read a typed value: a number with an optional SI prefix and unit symbol.
 * Both "4.7k" and "4k7" (the prefix as the decimal point, as printed on
 * parts) work, as does "4R7" for 4.7 Ω. A number with no unit is in the
 * shown unit: degrees for an angle, percent for a ratio.
 */
export function parseQuantity(text: string, quantity: Quantity): Parsed {
  const q = QUANTITIES[quantity];
  let s = text.trim().replace(/,/g, "").replace(/\s+/g, "");
  if (!s) return { ok: false, error: "Enter a value." };

  // The unit symbol, or an alias, at the end.
  let kelvin = false;
  let radians = false;
  let hadSymbol = true;
  const symbols = [q.symbol, q.si, ...(q.aliases ?? [])].filter(Boolean).sort((a, b) => b.length - a.length);
  const lower = s.toLowerCase();
  if (quantity === "temperature" && /k$/i.test(s) && !/°c$/i.test(s)) {
    kelvin = true;
    s = s.slice(0, -1);
  } else if (quantity === "angle" && /rad$/i.test(s)) {
    radians = true;
    s = s.slice(0, -3);
  } else {
    hadSymbol = false;
    for (const sym of symbols) {
      if (lower.endsWith(sym.toLowerCase())) {
        s = s.slice(0, s.length - sym.length);
        hadSymbol = true;
        break;
      }
    }
  }

  // "4k7", "4R7", "2M2": the prefix (or R for ohms) as the decimal point.
  let prefix = "";
  const infix = /^(\d+)([pnµumkMGRr])(\d+)$/.exec(s);
  if (infix) {
    const mark = infix[2];
    prefix = mark === "R" || mark === "r" ? "" : mark;
    s = `${infix[1]}.${infix[3]}`;
    if ((mark === "R" || mark === "r") && quantity !== "resistance") return { ok: false, error: `“${text.trim()}” isn't a value here.` };
  } else {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([pnµumkMGh]|meg)?$/i.exec(s);
    if (!m) return { ok: false, error: `“${text.trim()}” isn't a number${q.symbol ? ` of ${q.symbol}` : ""}.` };
    s = m[1];
    // Case matters for prefixes: m is milli, M is mega. "meg" is mega, as in SPICE.
    const raw = m[2] ?? "";
    prefix = raw.toLowerCase() === "meg" ? "M" : raw;
  }
  if (prefix === "u") prefix = "µ";
  if (!prefix && !hadSymbol && q.bare) prefix = q.bare;
  if (prefix && !(prefix in PREFIX)) return { ok: false, error: `“${prefix}” isn't an SI prefix.` };
  if (prefix && !q.prefixes.length) return { ok: false, error: `${q.symbol || "This value"} takes no prefix.` };
  // A lone "m" on a resistance is almost always a mistyped M: say so instead of reading milliohms.
  if (quantity === "resistance" && prefix === "m") return { ok: false, error: "m is milli. For megaohms type M (10M) or meg." };

  const n = Number(s) * (prefix ? PREFIX[prefix] : 1);
  if (!Number.isFinite(n)) return { ok: false, error: `“${text.trim()}” isn't a number.` };
  if (kelvin) return { ok: true, value: n - 273.15 };
  if (radians) return { ok: true, value: n };
  // A prefixed entry is in the base unit already ("300m" meters = 0.3 m); a bare number is in the shown unit.
  return { ok: true, value: n / q.factor };
}

/** The range as helper text, in the shown unit: "0.1 Ω to 10 MΩ". */
export function formatRange(min: number, max: number, quantity: Quantity): string {
  return `${formatQuantity(min, quantity)} to ${formatQuantity(max, quantity)}`;
}

// ── E24 and resistor color bands ───────────────────────────────────────────

/** The E24 series: 24 values per decade, ±5 % parts. */
export const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1] as const;

/** The E24 value nearest `ohms` (on a log scale, as the series is spaced). */
export function nearestE24(ohms: number): number {
  if (!(ohms > 0)) return E24[0];
  const decade = Math.floor(Math.log10(ohms));
  const scale = 10 ** decade;
  let best = E24[0] * scale;
  let bestErr = Infinity;
  for (const d of [decade - 1, decade, decade + 1]) {
    for (const m of E24) {
      const v = m * 10 ** d;
      const err = Math.abs(Math.log(v / ohms));
      if (err < bestErr) {
        bestErr = err;
        best = v;
      }
    }
  }
  return Number(best.toPrecision(2));
}

export const isE24 = (ohms: number) => ohms > 0 && Math.abs(nearestE24(ohms) - ohms) / ohms < 1e-9;
