import type { PinRole } from "@kiungo/core/parts/types";

/** What each kind of pin is called, wherever pins are listed. */
export const ROLE_LABEL: Record<PinRole, string> = {
  power: "Power",
  ground: "Ground",
  digital: "Digital",
  analog: "Analog",
  pwm: "PWM",
  data: "Data",
  clock: "Clock",
  uart: "UART",
  spi: "SPI",
  i2c: "I2C",
  mechanical: "Mechanical",
  other: "Other",
};

/**
 * The color of each kind of pin: the lab's wire colors, so a red label in the
 * library is a red wire on the canvas. The fallbacks are those same colors,
 * for pages that don't carry the lab's variables.
 */
export const ROLE_COLOR: Record<PinRole, string> = {
  power: "var(--lab-power, #ef4444)",
  ground: "var(--lab-ground, #64748b)",
  digital: "var(--lab-digital, #3b82f6)",
  analog: "var(--lab-analog, #10b981)",
  pwm: "var(--lab-pwm, #f59e0b)",
  data: "var(--lab-bus, #8b5cf6)",
  clock: "var(--lab-bus, #8b5cf6)",
  uart: "var(--lab-bus, #8b5cf6)",
  spi: "var(--lab-bus, #8b5cf6)",
  i2c: "var(--lab-bus, #8b5cf6)",
  mechanical: "var(--muted)",
  other: "var(--muted)",
};

/** The kinds of pin a part has, in the order a legend lists them. */
export function rolesOf(pins: ReadonlyArray<{ role: PinRole }>): PinRole[] {
  const order: PinRole[] = ["power", "ground", "digital", "pwm", "analog", "i2c", "spi", "uart", "data", "clock", "mechanical", "other"];
  const seen = new Set(pins.map((pin) => pin.role));
  return order.filter((role) => seen.has(role));
}
