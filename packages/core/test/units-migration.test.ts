/**
 * B8.7: a session saved before SI units opens unchanged. Each fixture in
 * fixtures/units-v1 was written by the lab before the change, with inputs in
 * the old units (cm, hPa, ms, %, °, ppm, a light %), and expected-frames.json
 * holds what the simulation did with it then. Opened through the file reader
 * today, every frame must be the same.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lab/circuit";
import { peripheralInputs } from "../src/lab/program";
import { parseSessionFile, toSessionFile } from "../src/lab/session-file";
import { migrateSessionUnits } from "../src/lab/session";
import { frameAt } from "../src/lab/simulate";

const DIR = join(__dirname, "fixtures/units-v1");
const expected = JSON.parse(readFileSync(join(DIR, "expected-frames.json"), "utf8")) as Record<string, unknown[]>;
const files = readdirSync(DIR).filter((f) => f.endsWith(".kiungo.json"));
const round = (v: unknown): unknown => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : Array.isArray(v) ? v.map(round) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v);

describe("sessions saved before SI units", () => {
  it("has a fixture for each case", () => {
    expect(files.length).toBe(Object.keys(expected).length);
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const file of files) {
    it(`${file} simulates exactly as it did`, () => {
      const { session } = parseSessionFile(readFileSync(join(DIR, file), "utf8"));
      expect(session.units).toBe(2);
      const analysis = analyze(session.nodes, session.wires, session.inputs);
      const board = session.nodes[0]!.id;
      const frames = [0.5, 1.3, 2.9, 7.4].map((t) => {
        const f = frameAt(session.nodes, session.wires, analysis, t, true, session.inputs);
        return round({
          t,
          nodes: Object.fromEntries(Object.entries(f.nodes).map(([k, n]) => [k, { on: n.on, level: n.level, angle: n.angle ?? null, rgb: n.rgb ?? null, text: n.text ?? null }])),
          pins: f.pins,
          wires: f.wires,
          peripherals: peripheralInputs(session.nodes, analysis, session.inputs, board, t).inputs,
        });
      });
      expect(frames).toEqual(expected[session.name]);
    });
  }

  it("converts each old key to SI, under its new name where the old one stated a unit", () => {
    const read = (name: string) => parseSessionFile(readFileSync(join(DIR, `${name}.kiungo.json`), "utf8")).session;
    const byPart = (name: string) => {
      const s = read(name);
      return Object.fromEntries(s.nodes.map((n) => [n.partId, s.inputs?.[n.id] ?? {}]));
    };
    expect(byPart("ultrasonic-alarm")["hc-sr04"]).toEqual({ source: "set", distance: 0.12 });
    expect(byPart("ultrasonic-alarm")["arduino-uno"]).toEqual({ warnDistance: 0.25, delay: 0.7 });
    expect(byPart("night-light").ldr.illuminance).toBeCloseTo(10 ** 1.1, 6);
    expect(byPart("night-light")["arduino-uno"].darkBelow).toBeCloseTo(10 ** 1.75, 6);
    const weather = byPart("weather");
    expect(weather.dht22).toEqual({ source: "set", temperatureC: 31.5, humidity: 0.72 });
    expect(weather.bmp280).toEqual({ source: "set", pressure: 99840, temperatureC: 19 });
    expect(weather.mq2).toEqual({ source: "set", gas: 0.00062 });
    expect(weather["soil-moisture"]).toEqual({ source: "set", moisture: 0.18 });
    expect(weather["arduino-uno"]).toEqual({ gasAlarm: 0.0005, dryBelow: 0.25 });
    const act = byPart("actuators");
    expect(act.servo.angle).toBeCloseTo(Math.PI / 4, 12);
    expect(act["dc-motor"]).toEqual({ source: "set", speed: 0.6, direction: "reverse" });
    expect(act["stepper-motor"]).toEqual({ source: "set", stepRate: 400, cmdFrom: 0, cmdTarget: 1024, cmdAt: 0 });
    const described = byPart("described");
    expect(described["sharp-ir"]).toEqual({ source: "set", distance: 0.41 });
    expect(described.vl53l0x).toEqual({ source: "set", distance: 0.64 });
    expect(described.ina219).toEqual({ source: "set", current: 0.38, busV: 4.9, power: 1.862 });
    expect(described.potentiometer).toEqual({ source: "set", position: 0.73 });
    expect(byPart("resistor").resistor).toEqual({ ohms: 1000 });
  });

  it("converts once: a session saved in SI is opened as it is", () => {
    const { session } = parseSessionFile(readFileSync(join(DIR, "weather.kiungo.json"), "utf8"));
    const again = parseSessionFile(JSON.stringify(toSessionFile(session))).session;
    expect(again.inputs).toEqual(session.inputs);
    expect(migrateSessionUnits(session)).toBe(session);
  });
});

describe("the file format", () => {
  it("is written as version 2 (inputs in SI), reads version 1 files, and refuses a newer version", () => {
    const { session } = parseSessionFile(readFileSync(join(DIR, "ultrasonic-alarm.kiungo.json"), "utf8"));
    const file = toSessionFile(session);
    expect(file.version).toBe(2);
    expect(file.session.units).toBe(2);
    const v1 = JSON.parse(readFileSync(join(DIR, "ultrasonic-alarm.kiungo.json"), "utf8"));
    expect(v1.version).toBe(1);
    expect(() => parseSessionFile({ ...file, version: 3 })).toThrow(/version 3; this lab reads version 2/);
  });
});
