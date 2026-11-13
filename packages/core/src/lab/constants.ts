/**
 * Numbers the lab's models share, kept in one place so the circuit check, the
 * simulation, the program runner and the part library can't disagree.
 */

/** The series resistor an LED gets in a real build, and the lab's default resistor: 220 Ω. */
export const LED_SERIES_OHMS = 220;

/** The TT gear motor's no-load speed at full duty: 140 rpm, as rad/s for display. */
export const DC_MOTOR_MAX_RPM = 140;
export const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;
export const DC_MOTOR_MAX_RAD_PER_S = DC_MOTOR_MAX_RPM * RPM_TO_RAD_PER_S;

/** The Arduino Servo library's pulse range: 544 µs is 0°, 2400 µs is 180°. */
export const SERVO_MIN_US = 544;
export const SERVO_MAX_US = 2400;

/** A motor's speed as people read it in the lab: rad/s first, rpm after. "14.7 rad/s (140 rpm)". */
export function motorSpeedText(rpm: number): string {
  return `${(rpm * RPM_TO_RAD_PER_S).toFixed(1)} rad/s (${rpm} rpm)`;
}
/** The short form, for a badge on the part: "14.7 rad/s". */
export const motorSpeedBadge = (rpm: number) => `${(rpm * RPM_TO_RAD_PER_S).toFixed(1)} rad/s`;
