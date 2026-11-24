/**
 * The obstacle test (Stage 0): a flat board stood in front of a distance
 * sensor, and what the sensor reads off it. Move the board and the reading
 * follows; move it out of the beam or past the sensor's range and there is
 * no echo, as on the bench.
 *
 * Seen from above, the sensor sits at the origin looking along +x. The
 * obstacle's face is a line across the beam at x = `distance`, `width` wide,
 * centered `offset` to the side of the beam's center line (+ is left). The
 * sensor hears the nearest point of that face inside its cone, so a board
 * straight ahead reads exactly its distance and one at the beam's edge reads
 * a little more. Lengths in meters, angles in radians.
 */

import { HC_SR04_RANGE_CM } from "../emulator/peripherals";

/** What a distance sensor can see: a cone `halfAngle` either side of straight ahead, from `min` to `max`. */
export interface Beam {
  halfAngle: number;
  min: number;
  max: number;
}

/** The HC-SR04: a cone about 15° wide (its datasheet's figure), 2 cm to 4 m. */
export const HC_SR04_BEAM: Beam = {
  halfAngle: (7.5 * Math.PI) / 180,
  min: HC_SR04_RANGE_CM.min / 100,
  max: HC_SR04_RANGE_CM.max / 100,
};

/**
 * What the HC-SR04's sketch value holds when nothing echoes: past the
 * module's 400 cm, so the emulated module times out its echo and a sketch
 * prints "Nothing in range", as the robot world reports it too.
 */
export const NO_ECHO_CM = 500;

export interface Obstacle {
  /** Straight ahead, from the sensor's face to the obstacle's. */
  distance: number;
  /** Sideways from the beam's center line, to the obstacle's middle. */
  offset: number;
  /** Across the beam. */
  width: number;
}

/** The test's board: 10 cm across, about a hand or a book standing up. */
export const OBSTACLE_WIDTH = 0.1;

/** Where the sensor hears the obstacle, or null when it doesn't. */
export interface Echo {
  /** From the sensor to the nearest point of the face it hears. */
  distance: number;
  /** That point, sensor at the origin looking along +x. */
  at: [number, number];
}

/** Half the beam's width at `distance` straight ahead. */
export function beamHalfWidth(beam: Beam, distance: number): number {
  return Math.max(0, distance) * Math.tan(beam.halfAngle);
}

/**
 * The echo off an obstacle: the nearest point of its face inside the beam,
 * or null when the face is outside the cone or the range.
 */
export function echoOff(beam: Beam, obstacle: Obstacle): Echo | null {
  const { distance, offset, width } = obstacle;
  if (!(distance > 0) || !Number.isFinite(distance) || !Number.isFinite(offset)) return null;
  const half = beamHalfWidth(beam, distance);
  // The part of the face inside the cone.
  const lo = Math.max(offset - width / 2, -half);
  const hi = Math.min(offset + width / 2, half);
  if (lo > hi) return null;
  // Its point nearest the sensor: on the center line if the face crosses it, else the edge closest to it.
  const y = Math.min(hi, Math.max(lo, 0));
  const d = Math.hypot(distance, y);
  if (d < beam.min || d > beam.max) return null;
  return { distance: d, at: [distance, y] };
}
