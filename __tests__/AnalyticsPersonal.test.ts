import { describe, expect, it } from "vitest";

import type { LabSession } from "@kiungo/core/lab/types";
import type { PartModel } from "@kiungo/core/parts/types";

import {
  calendar,
  collectEvents,
  dayKey,
  debugging,
  faultKey,
  headline,
  insights,
  learning,
  modeMix,
  partUsage,
  periodFor,
  projectsSummary,
  recordSteps,
  untriedParts,
  weeklyGoal,
} from "@/lib/analytics/personal";
import type { ExperimentRecord, RoboticsProject } from "@/lib/robotics-data";

// Thursday 5 November 2026, midday local time.
const NOW = new Date(2026, 10, 5, 12, 0, 0);
const at = (daysAgo: number, hour = 12) => new Date(2026, 10, 5 - daysAgo, hour, 0, 0).toISOString();

const CATALOG = [
  { id: "arduino-uno", name: "Arduino Uno", group: "boards", rank: 1 },
  { id: "breadboard", name: "Breadboard", group: "prototyping", rank: 1 },
  { id: "hc-sr04", name: "HC-SR04", group: "sensors", rank: 1 },
  { id: "dht11", name: "DHT11", group: "sensors", rank: 2 },
  { id: "led", name: "LED", group: "outputs", rank: 1 },
  { id: "servo", name: "Servo", group: "outputs", rank: 2 },
  { id: "oled", name: "OLED display", group: "displays", rank: 1 },
  { id: "lcd", name: "LCD 16x2", group: "displays", rank: 2 },
] as unknown as PartModel[];

function session(id: string, daysAgo: number, parts: Array<[string, "virtual" | "physical" | "hybrid"]>, log: Array<[number, string, string]> = [], runMs = 0): LabSession {
  return {
    id,
    name: id,
    projectId: "p1",
    createdAt: at(daysAgo),
    updatedAt: at(log.length ? Math.min(...log.map((l) => l[0])) : daysAgo),
    nodes: parts.map(([partId, mode], i) => ({ id: `${id}-n${i}`, partId, label: partId, x: 0, y: 0, mode })),
    wires: [{ id: `${id}-w`, from: { node: "a", pin: "1" }, to: { node: "b", pin: "2" } }],
    log: log.map(([d, kind, text], i) => ({ id: `${id}-l${i}`, at: at(d), kind: kind as LabSession["log"][number]["kind"], text })),
    view: { x: 0, y: 0, zoom: 1 } as unknown as LabSession["view"],
    runMs,
  };
}

const SESSIONS: LabSession[] = [
  session("rover", 2, [["arduino-uno", "virtual"], ["hc-sr04", "hybrid"], ["led", "virtual"]], [
    [2, "build", "Placed the HC-SR04"],
    [2, "run", "Run started"],
    [2, "fault", "LED1 has no resistor"],
    [1, "fix", "Added a resistor to LED1"],
    [1, "run", "Run started"],
  ], 600_000),
  session("sonar", 10, [["arduino-uno", "virtual"], ["hc-sr04", "virtual"]], [
    [10, "run", "Run started"],
    [10, "fault", "LED2 has no resistor"],
    [9, "fault", "Pin 13 is driven by two outputs"],
  ], 300_000),
  session("old", 200, [["arduino-uno", "physical"], ["servo", "physical"]], [[200, "run", "Run started"]], 60_000),
];

const PROJECTS: RoboticsProject[] = [
  { id: "p1", name: "Rover", description: "", objectives: "", contributors: "", category: "robotics", hardware: ["Arduino Uno"], teammates: [{ id: "t", display_name: "T", email: "t@x" }], createdAt: at(3), updatedAt: at(3) },
  { id: "p2", name: "Weather", description: "", objectives: "", contributors: "", category: "iot", hardware: [], createdAt: at(120), updatedAt: at(120) },
];

const RECORDS: ExperimentRecord[] = [
  { id: "r1", projectId: "p1", title: "Range test", objective: "Measure range", hardware: [], procedure: "Move a book", observations: "", results: "", notes: "", createdAt: at(1), updatedAt: at(1) },
  { id: "r2", projectId: "p1", title: "Speed", objective: "x", hardware: [], procedure: "y", observations: "z", results: "w", notes: "", createdAt: at(4), updatedAt: at(4) },
];

const events = collectEvents({ sessions: SESSIONS, projects: PROJECTS, experiments: RECORDS });

describe("periods", () => {
  it("30 days runs from 29 days ago at midnight to now, with the 30 days before as the comparison", () => {
    const p = periodFor("30d", NOW);
    expect(dayKey(p.from!)).toBe("2026-10-07");
    expect(p.from!.getHours()).toBe(0);
    expect(dayKey(p.previous!.from)).toBe("2026-09-07");
    expect(p.previous!.to.getTime()).toBe(p.from!.getTime() - 1);
  });
  it("All time has no start and no comparison", () => {
    expect(periodFor("all", NOW)).toMatchObject({ from: null, previous: null });
  });
});

describe("headline", () => {
  it("counts what happened in the period, with the period before", () => {
    const h = Object.fromEntries(
      headline({ sessions: SESSIONS, projects: PROJECTS, events, completed: new Set(["a", "b"]), moduleCount: 9, catalogSize: CATALOG.length, period: periodFor("30d", NOW), now: NOW }).map((x) => [x.id, x]),
    );
    expect(h.projects).toMatchObject({ value: 1, previous: 0 });
    expect(h.sessions).toMatchObject({ value: 2, previous: 0 });
    expect(h.runs).toMatchObject({ value: 3, previous: 0 });
    expect(h.parts).toMatchObject({ value: 3, of: 8 }); // Uno, HC-SR04, LED
    expect(h.modules).toMatchObject({ value: 2, of: 9 });
    expect(h.modules.previous).toBeUndefined(); // completions have no dates
    expect(h.runs.trend.reduce((a, b) => a + b, 0)).toBe(3);
  });
  it("All time includes the old session", () => {
    const h = headline({ sessions: SESSIONS, projects: PROJECTS, events, completed: new Set(), moduleCount: 9, catalogSize: 8, period: periodFor("all", NOW), now: NOW });
    expect(h.find((x) => x.id === "sessions")!.value).toBe(3);
    expect(h.find((x) => x.id === "parts")!.value).toBe(4);
  });
});

describe("calendar and weekly goal", () => {
  it("lays out Monday-first weeks ending this week, lighting days relative to the busiest", () => {
    const weeks = calendar(events, periodFor("30d", NOW), NOW);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date.getDay()).toBe(1); // Monday
    const last = weeks[weeks.length - 1];
    expect(last.some((d) => d.key === dayKey(NOW))).toBe(true);
    const days = weeks.flat();
    const busiest = days.find((d) => d.key === dayKey(new Date(at(2))))!;
    expect(busiest.count).toBe(3);
    expect(busiest.level).toBe(4);
    expect(days.find((d) => d.key === dayKey(new Date(at(9))))!.level).toBe(2); // 1 of 3
    // Days after today, and before the period, are out of range and dark.
    expect(days.filter((d) => !d.inRange).every((d) => d.level === 0)).toBe(true);
  });
  it("counts active days per week against the goal; the run counts back from last week", () => {
    const g = weeklyGoal(events, 2, NOW, 4);
    expect(g.weeks).toHaveLength(4);
    expect(g.thisWeek.current).toBe(true);
    expect(g.thisWeek.activeDays).toBe(3); // Mon 2 Nov (3 ago: project), Tue (2 ago), Wed (1 ago)
    expect(g.thisWeek.met).toBe(true);
    expect(g.weeks[2].activeDays).toBe(3); // last week: 10 and 9 days ago (lab), and Sunday's record
    expect(g.run).toBe(2);
    expect(weeklyGoal(events, 7, NOW, 4).run).toBe(0);
  });
});

describe("parts, modes and debugging", () => {
  it("ranks parts by the sessions that use them and remembers which", () => {
    const uses = partUsage(SESSIONS, CATALOG, periodFor("30d", NOW), NOW);
    expect(uses.map((u) => u.partId)).toEqual(["arduino-uno", "hc-sr04", "led"]);
    expect(uses[1]).toMatchObject({ name: "HC-SR04", group: "sensors", sessions: 2, sessionIds: ["rover", "sonar"] });
  });
  it("lists untried parts by group, most common first", () => {
    const untried = untriedParts(SESSIONS, CATALOG);
    expect(untried.get("displays")!.map((p) => p.id)).toEqual(["oled", "lcd"]);
    expect(untried.get("sensors")!.map((p) => p.id)).toEqual(["dht11"]);
    expect(untried.has("boards")).toBe(false);
  });
  it("mixes virtual, physical and hybrid parts", () => {
    expect(modeMix(SESSIONS, periodFor("30d", NOW), NOW)).toEqual({ virtual: 4, physical: 0, hybrid: 1 });
    expect(modeMix(SESSIONS, periodFor("all", NOW), NOW).physical).toBe(2);
  });
  it("counts runs, faults and fixes, and groups faults that differ only by a part number", () => {
    const d = debugging(SESSIONS, events, periodFor("30d", NOW), NOW);
    expect(d).toMatchObject({ runs: 3, faults: 3, fixes: 1, runMs: 900_000, wires: 2 });
    expect(d.common[0]).toEqual({ text: "LED has no resistor", count: 2 });
    expect(faultKey("Pin 13 is driven by two outputs")).toBe("Pin 13 is driven by two outputs");
    expect(faultKey("HC-SR04 echo isn't wired")).toBe("HC-SR04 echo isn't wired");
    expect(faultKey("Servo2 is powered from a pin")).toBe("Servo is powered from a pin");
  });
});

describe("learning, projects and records", () => {
  const modules = [
    { slug: "a", order: 1, topic: "foundations", minutes: 10 },
    { slug: "b", order: 2, topic: "foundations", minutes: 15 },
    { slug: "c", order: 3, topic: "sensors", minutes: 20 },
  ];
  it("summarizes the path by topic and picks the first unfinished module", () => {
    const l = learning(modules, new Set(["a"]), ["foundations", "arduino", "sensors"]);
    expect(l.topics).toEqual([{ topic: "foundations", done: 1, total: 2 }, { topic: "sensors", done: 0, total: 1 }]);
    expect(l.next?.slug).toBe("b");
    expect(l).toMatchObject({ done: 1, total: 3, minutesLeft: 35 });
    expect(learning(modules, new Set(["a", "b", "c"]), ["foundations"]).next).toBeNull();
  });
  it("finds records missing a step", () => {
    expect(recordSteps(RECORDS[0])).toEqual({ objective: true, procedure: true, observations: false, results: false });
    const s = projectsSummary(PROJECTS, RECORDS, periodFor("all", NOW), NOW);
    expect(s.byCategory).toEqual([{ category: "robotics", count: 1 }, { category: "iot", count: 1 }]);
    expect(s).toMatchObject({ records: 2, complete: 1, withTeammates: 1 });
    expect(s.incomplete[0]).toMatchObject({ record: { id: "r1" }, missing: ["observations", "results"] });
  });
});

describe("insights", () => {
  const period = periodFor("30d", NOW);
  const base = () => ({
    parts: partUsage(SESSIONS, CATALOG, period, NOW),
    sessionsInRange: 2,
    debug: debugging(SESSIONS, events, period, NOW),
    records: projectsSummary(PROJECTS, RECORDS, period, NOW),
    next: { title: "Servo control", minutes: 15, href: "/learn/servo" },
    untried: untriedParts(SESSIONS, CATALOG),
    groupTitles: { boards: "Boards", prototyping: "Breadboards", sensors: "Sensors", outputs: "Outputs", displays: "Displays", radios: "Radios" },
    events,
    period,
    now: NOW,
    partHref: (id: string) => `/components?part=${id}`,
  });

  it("states real findings, each with an action, at most four", () => {
    const list = insights(base());
    expect(list.length).toBeLessThanOrEqual(4);
    const byId = Object.fromEntries(list.map((i) => [i.id, i]));
    expect(byId["favorite-part"].text).toBe("The Arduino Uno is in 2 of your 2 lab sessions.");
    expect(byId["incomplete-records"]).toMatchObject({ text: 'Your record "Range test" has no observations yet.', action: { href: "/experiments?project=p1&record=r1" } });
    expect(byId["fix-rate"].text).toBe("You fixed 1 of the 3 faults you met. The most common: LED has no resistor.");
    expect(byId["try-displays"]).toMatchObject({ text: "You haven't used any displays yet. A good first one: OLED display.", action: { href: "/components?part=oled" } });
  });

  it("prefers the part the community uses most when suggesting one to try", () => {
    const list = insights({ ...base(), communityParts: ["lcd", "oled"] });
    expect(list.find((i) => i.id === "try-displays")!.text).toContain("LCD 16x2");
  });

  it("says nothing it can't back up", () => {
    const empty = insights({
      ...base(),
      parts: [],
      sessionsInRange: 0,
      debug: { runs: 0, faults: 0, fixes: 0, common: [], runMs: 0, wires: 0 },
      records: { byCategory: [], records: 0, complete: 0, incomplete: [], withTeammates: 0 },
      next: null,
      untried: new Map(),
      events: [],
    });
    expect(empty).toEqual([]);
  });
});
