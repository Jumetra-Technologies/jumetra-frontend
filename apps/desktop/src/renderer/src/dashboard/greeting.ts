import { useEffect, useState } from "react";

/**
 * The dashboard's greeting, from the computer's clock and calendar.
 *
 * On a public holiday it's the holiday's greeting all day ("Merry Christmas,
 * Brad"). Otherwise it follows the time of day:
 *   05:00–11:59 Good morning · 12:00–17:59 Good afternoon ·
 *   18:00–22:59 Good evening · 23:00–04:59 Lock in late night.
 *
 * Holidays everyone shares are always on. A country's own public holidays
 * are added when the computer's time zone is in that country (Africa/Nairobi
 * for Kenya). Holidays that follow the moon (Eid) aren't included: their date
 * depends on the sighting and can't be known in advance.
 */
export function greetingFor(now: Date, name: string | null, timeZone = localTimeZone()): string {
  const holiday = holidayOn(now, timeZone);
  const base = holiday ?? partOfDay(now.getHours());
  return name ? `${base}, ${name}` : base;
}

export function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 23) return "Good evening";
  return "Lock in late night";
}

/** "Wednesday, 11 November": today, as the person's language writes it. */
export function dateLine(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

type Rule = { month: number; day: number; greeting: string } | { on: (year: number) => Date; greeting: string };

/** Observed nearly everywhere Kiungo is used. Months are 1–12. */
const SHARED: Rule[] = [
  { month: 1, day: 1, greeting: "Happy New Year" },
  { on: easterSunday, greeting: "Happy Easter" },
  { month: 12, day: 25, greeting: "Merry Christmas" },
];

/** A country's own public holidays, by the time zones in it. */
const BY_COUNTRY: Array<{ zones: string[]; rules: Rule[] }> = [
  {
    // Kenya: the public holidays in the Public Holidays Act with a fixed date.
    zones: ["Africa/Nairobi"],
    rules: [
      { month: 5, day: 1, greeting: "Happy Labour Day" },
      { month: 6, day: 1, greeting: "Happy Madaraka Day" },
      { month: 10, day: 10, greeting: "Happy Utamaduni Day" },
      { month: 10, day: 20, greeting: "Happy Mashujaa Day" },
      { month: 12, day: 12, greeting: "Happy Jamhuri Day" },
      { month: 12, day: 26, greeting: "Happy Boxing Day" },
    ],
  },
];

export function holidayOn(now: Date, timeZone: string): string | null {
  const rules = [...SHARED, ...BY_COUNTRY.filter((c) => c.zones.includes(timeZone)).flatMap((c) => c.rules)];
  for (const rule of rules) {
    if ("on" in rule) {
      const d = rule.on(now.getFullYear());
      if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) return rule.greeting;
    } else if (rule.month === now.getMonth() + 1 && rule.day === now.getDate()) return rule.greeting;
  }
  return null;
}

/** Western Easter Sunday (the anonymous Gregorian algorithm), in local time. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

/** The current time, updated at the turn of every minute, so the greeting changes while the app is open. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = new Date();
      setNow(next);
      timer = setTimeout(tick, 60_000 - (next.getTime() % 60_000) + 50);
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(timer);
  }, []);
  return now;
}
