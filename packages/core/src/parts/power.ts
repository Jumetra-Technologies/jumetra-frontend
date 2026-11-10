/**
 * Power and heat from a part's spec: what a driver loses, what a converter
 * draws, how warm a part runs. The library shows these numbers and the lab
 * budgets with them, so they are worked out in one place.
 */
import type { PartSpec } from "./types";

type Bridge = NonNullable<PartSpec["power"]["bridge"]>;
type Converter = NonNullable<PartSpec["power"]["converter"]>;
type Motor = NonNullable<PartSpec["power"]["motor"]>;

/** Room temperature the estimates start from, °C. */
export const AMBIENT_C = 25;

/** Volts a driver or switch loses passing `amps`: its on-resistance times the current, and never less than its saturation drop. */
export function bridgeDrop(bridge: Bridge, amps: number): number {
  if (amps <= 0) return 0;
  return Math.max(bridge.dropV ?? 0, (bridge.ohms ?? 0) * amps);
}

/** Watts a driver channel turns into heat passing `amps`. */
export function bridgeLoss(bridge: Bridge, amps: number): number {
  return bridgeDrop(bridge, amps) * amps;
}

/** Amps in one winding of a motor on this driver: what the motor takes (`ma`, its running current unless given), or the driver's limit when it holds the current lower. */
export function windingAmps(bridge: Bridge | undefined, motor: Motor, ma = motor.runMa): number {
  return (bridge?.limitMa ? Math.min(ma, bridge.limitMa) : ma) / 1000;
}

/**
 * Amps a driver takes from its motor supply to run `windings` windings of a
 * motor. A plain bridge passes the motor's current straight through. A
 * chopper (one with `limitMa`) holds the winding current and steps the
 * supply down to do it, so power in equals power out: the copper loss in
 * the windings plus its own loss, over the supply voltage. Turning a load
 * adds a little that this leaves out.
 */
export function bridgeInput(bridge: Bridge | undefined, motor: Motor, supplyV: number, windings = 1, ma = motor.runMa): number {
  const amps = windingAmps(bridge, motor, ma);
  if (!bridge?.limitMa || supplyV <= 0 || motor.runMa <= 0) return amps * windings;
  const ohms = motor.ratedV / (motor.runMa / 1000);
  return Math.min(amps * windings, (windings * (amps * amps * ohms + bridgeLoss(bridge, amps))) / supplyV);
}

/** The volts a converter gives from `vin`: its set voltage, limited by what the input allows. */
export function converterOut(converter: Converter, vin: number, set = converter.volts): number {
  const dropout = converter.dropout ?? 0;
  if (converter.law === "boost") return Math.max(set, vin - dropout);
  if (converter.law === "pass") return Math.max(0, vin - dropout);
  return Math.max(0, Math.min(set, vin - dropout));
}

/** Watts a converter turns into heat delivering `amps` from `vin`. */
export function converterLoss(converter: Converter, vin: number, amps: number, set = converter.volts): number {
  const vout = converterOut(converter, vin, set);
  if (converter.law === "linear" || converter.law === "pass") return Math.max(0, vin - vout) * amps;
  const efficiency = converter.efficiency ?? 0.85;
  return vout * amps * (1 / efficiency - 1);
}

/** Amps a converter draws from its input to deliver `amps` at its output. */
export function converterInput(converter: Converter, vin: number, amps: number, set = converter.volts): number {
  if (converter.law === "linear" || converter.law === "pass") return amps;
  if (vin <= 0) return 0;
  const efficiency = converter.efficiency ?? 0.85;
  return (converterOut(converter, vin, set) * amps) / (efficiency * vin);
}

/** A converter's efficiency from `vin` at its set voltage: a linear one's is volts out over volts in. */
export function converterEfficiency(converter: Converter, vin: number, set = converter.volts): number {
  if (converter.law === "linear") return vin > 0 ? Math.min(1, converterOut(converter, vin, set) / vin) : 0;
  if (converter.law === "pass") return vin > 0 ? converterOut(converter, vin, set) / vin : 0;
  return converter.efficiency ?? 0.85;
}

export interface Heat {
  /** Watts turned into heat. */
  watts: number;
  /** °C above the room. */
  rise: number;
  /** °C, in a 25 °C room. */
  tempC: number;
  /** Past the hottest it may run. */
  over: boolean;
  /** The case this is for, in words: "at 1 A per motor". */
  condition: string;
}

/** How warm a part gets losing `watts`, by its thermal data. Null without any. */
export function heatFor(spec: PartSpec | undefined, watts: number, condition: string, ambient = AMBIENT_C): Heat | null {
  const thermal = spec?.thermal;
  if (!thermal) return null;
  const rise = watts * thermal.thetaCW;
  const tempC = ambient + rise;
  return { watts, rise, tempC, over: tempC > thermal.maxC, condition };
}

const amps = (ma: number) => (ma >= 1000 ? `${trim(ma / 1000)} A` : `${Math.round(ma)} mA`);
const trim = (n: number) => String(Math.round(n * 100) / 100);

/**
 * How warm a part runs in a typical hard-working case, from its spec: a
 * driver passing 1 A, a linear regulator dropping 4 V at 300 mA, a switching
 * converter at half its rated current, a motor stalled. Null for parts with
 * no thermal data.
 */
export function typicalHeat(spec: PartSpec | undefined, ambient = AMBIENT_C): Heat | null {
  if (!spec?.thermal) return null;
  const { power, thermal } = spec;
  if (thermal.typicalW !== undefined) return heatFor(spec, thermal.typicalW, thermal.at ?? "in typical use", ambient);
  if (power.bridge) {
    const ma = Math.min(1000, power.bridge.maxMa);
    return heatFor(spec, bridgeLoss(power.bridge, ma / 1000), `passing ${amps(ma)}${power.bridge.channels > 1 ? " through one channel" : ""}`, ambient);
  }
  if (power.converter) {
    const c = power.converter;
    if (c.law === "linear") {
      const ma = Math.min(300, c.maxMa);
      const vin = c.volts + 4;
      return heatFor(spec, converterLoss(c, vin, ma / 1000), `giving ${amps(ma)} at ${trim(c.volts)} V from ${trim(vin)} V`, ambient);
    }
    const ma = c.maxMa / 2;
    const vin = c.law === "boost" ? Math.max(1, c.volts * 0.74) : c.volts + 7;
    return heatFor(spec, converterLoss(c, vin, ma / 1000), `giving ${amps(ma)} at ${trim(c.volts)} V`, ambient);
  }
  if (power.motor) return heatFor(spec, (power.motor.ratedV * power.motor.stallMa) / 1000, `stalled at ${trim(power.motor.ratedV)} V`, ambient);
  if (power.draw && power.supply) {
    const volts = power.supply.typ ?? power.supply.max;
    return heatFor(spec, (volts * power.draw.active) / 1000, `drawing ${amps(power.draw.active)} at ${trim(volts)} V`, ambient);
  }
  return null;
}

/** Watts a part takes from its supply while working, when its spec says enough to tell. */
export function typicalWatts(spec: PartSpec | undefined): number | null {
  const power = spec?.power;
  if (!power?.draw || !power.supply) return null;
  return ((power.supply.typ ?? power.supply.max) * power.draw.active) / 1000;
}
