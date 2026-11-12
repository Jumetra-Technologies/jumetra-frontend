import { describe, expect, it } from "vitest";
import { DC_MOTOR_MAX_RAD_PER_S, DC_MOTOR_MAX_RPM, LED_SERIES_OHMS, SERVO_MAX_US, SERVO_MIN_US, motorSpeedBadge, motorSpeedText } from "./constants";
import { LED_SERIES_OHMS as FROM_CIRCUIT } from "./circuit";
import { DC_MOTOR_MAX_RPM as FROM_SIMULATE } from "./simulate";
import { DEFAULT_OHMS } from "../parts/models/passives";
import { servoAngle } from "./program";

describe("numbers the lab's models share", () => {
  it("come from one place: the circuit check, the simulation and the resistor agree", () => {
    expect(FROM_CIRCUIT).toBe(LED_SERIES_OHMS);
    expect(FROM_SIMULATE).toBe(DC_MOTOR_MAX_RPM);
    expect(DEFAULT_OHMS).toBe(LED_SERIES_OHMS);
    expect(servoAngle(SERVO_MIN_US)).toBe(0);
    expect(servoAngle(SERVO_MAX_US)).toBe(180);
  });

  it("give a motor's speed in rad/s first, rpm after", () => {
    expect(DC_MOTOR_MAX_RAD_PER_S).toBeCloseTo(14.66, 2);
    expect(motorSpeedText(140)).toBe("14.7 rad/s (140 rpm)");
    expect(motorSpeedText(0)).toBe("0.0 rad/s (0 rpm)");
    expect(motorSpeedBadge(60)).toBe("6.3 rad/s");
  });
});
