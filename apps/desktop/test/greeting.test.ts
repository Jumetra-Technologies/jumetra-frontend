import { describe, expect, it } from "vitest";
import { easterSunday, greetingFor, holidayOn, partOfDay } from "../src/renderer/src/dashboard/greeting";

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);
const NAIROBI = "Africa/Nairobi";
const ELSEWHERE = "Europe/Berlin";

describe("the dashboard greeting", () => {
  it("follows the time of day, with the name when there is one", () => {
    expect(greetingFor(at(2026, 11, 11, 9), "Brad", ELSEWHERE)).toBe("Good morning, Brad");
    expect(greetingFor(at(2026, 11, 11, 14), "Brad", ELSEWHERE)).toBe("Good afternoon, Brad");
    expect(greetingFor(at(2026, 11, 11, 19), "Brad", ELSEWHERE)).toBe("Good evening, Brad");
    expect(greetingFor(at(2026, 11, 11, 23, 30), "Brad", ELSEWHERE)).toBe("Lock in late night, Brad");
    expect(greetingFor(at(2026, 11, 11, 9), null, ELSEWHERE)).toBe("Good morning");
  });

  it("changes at 5:00, 12:00, 18:00 and 23:00 exactly", () => {
    expect([4, 5, 11, 12, 17, 18, 22, 23, 0].map(partOfDay)).toEqual([
      "Lock in late night",
      "Good morning",
      "Good morning",
      "Good afternoon",
      "Good afternoon",
      "Good evening",
      "Good evening",
      "Lock in late night",
      "Lock in late night",
    ]);
  });

  it("on a holiday, it's the holiday's greeting all day", () => {
    for (const hour of [0, 8, 15, 20, 23]) expect(greetingFor(at(2026, 12, 25, hour), "Brad", ELSEWHERE)).toBe("Merry Christmas, Brad");
    expect(greetingFor(at(2027, 1, 1, 10), null, ELSEWHERE)).toBe("Happy New Year");
    expect(greetingFor(at(2026, 12, 24, 23, 59), "Brad", ELSEWHERE)).toBe("Lock in late night, Brad");
    expect(greetingFor(at(2026, 12, 26, 0, 0), "Brad", ELSEWHERE)).toBe("Lock in late night, Brad");
  });

  it("knows when Easter falls", () => {
    expect([2025, 2026, 2027, 2028].map((y) => easterSunday(y).toDateString())).toEqual([
      new Date(2025, 3, 20).toDateString(),
      new Date(2026, 3, 5).toDateString(),
      new Date(2027, 2, 28).toDateString(),
      new Date(2028, 3, 16).toDateString(),
    ]);
    expect(greetingFor(at(2026, 4, 5, 11), "Brad", ELSEWHERE)).toBe("Happy Easter, Brad");
  });

  it("adds Kenya's own public holidays on a computer set to Kenyan time", () => {
    expect(holidayOn(at(2026, 6, 1, 9), NAIROBI)).toBe("Happy Madaraka Day");
    expect(holidayOn(at(2026, 10, 20, 9), NAIROBI)).toBe("Happy Mashujaa Day");
    expect(holidayOn(at(2026, 12, 12, 9), NAIROBI)).toBe("Happy Jamhuri Day");
    expect(holidayOn(at(2026, 5, 1, 9), NAIROBI)).toBe("Happy Labour Day");
    expect(holidayOn(at(2026, 6, 1, 9), ELSEWHERE)).toBeNull();
    expect(holidayOn(at(2026, 11, 11, 9), NAIROBI)).toBeNull();
  });
});
