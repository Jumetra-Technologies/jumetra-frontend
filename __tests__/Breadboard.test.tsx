import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { planAutoWire } from "@/lib/lab/autowire";
import { boardGeometry } from "@/lib/lab/board-geometry";
import { breadboardUse, railSummary } from "@/lib/lab/breadboard";
import { analyze } from "@/lib/lab/circuit";
import { nodeFootprint, nodeLayout } from "@/lib/lab/layout";
import { getPinout } from "@/lib/lab/pinout";
import { frameAt, serialLine } from "@/lib/lab/simulate";
import { suggest } from "@/lib/lab/suggest";
import type { LabNode, LabWire } from "@/lib/lab/types";
import { getPart } from "@/lib/parts";
import { BREADBOARD_HOLES, BREADBOARD_SPECS, BREADBOARD_STRIPS } from "@/lib/parts/models/breadboard";
import { freshLab } from "./helpers/lab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const node = (id: string, partId: string, x = 0, y = 0): LabNode => ({ id, partId, label: getPart(partId)?.name.split(" (")[0] ?? partId, x, y, mode: "virtual" });
let seq = 0;
const wire = (a: string, ap: string, b: string, bp: string): LabWire => ({ id: `w${++seq}`, from: { node: a, pin: ap }, to: { node: b, pin: bp } });

const uno = node("uno", "arduino-uno", 0, 0);
const bb = node("bb", "breadboard", 420, 0);
/** The Uno's 5 V and GND on the top rails, as the lab wires a new breadboard. */
const fed = () => [wire("uno", "5V", "bb", "TP1"), wire("uno", "GND1", "bb", "TN1")];

describe("The breadboard model", () => {
  it("is a 400-point half-size board: 30 columns of a–e and f–j, four 25-hole rails", () => {
    const part = getPart("breadboard")!;
    expect(part.group).toBe("prototyping");
    expect(BREADBOARD_HOLES).toHaveLength(400);
    expect(BREADBOARD_STRIPS).toHaveLength(64);
    expect(BREADBOARD_STRIPS.filter((s) => s.length === 5)).toHaveLength(60);
    expect(BREADBOARD_STRIPS.filter((s) => s.length === 25)).toHaveLength(4);
    // Columns and rows on the 0.1" grid; the channel is three pitches wide.
    const at = (id: string) => BREADBOARD_HOLES.find((h) => h.id === id)!;
    expect(at("a2").x - at("a1").x).toBeCloseTo(2.54, 2);
    expect(at("b1").y - at("a1").y).toBeCloseTo(2.54, 2);
    expect(at("f1").y - at("e1").y).toBeCloseTo(7.62, 2);
    // Rail holes come in fives with a gap.
    expect(at("TP6").x - at("TP5").x).toBeCloseTo(5.08, 2);
    for (const h of BREADBOARD_HOLES) {
      expect(h.x).toBeGreaterThan(0);
      expect(h.x).toBeLessThan(part.size.w);
      expect(h.y).toBeGreaterThan(0);
      expect(h.y).toBeLessThan(part.size.h);
    }
    // Every lab pin has a hole on the canvas.
    for (const pin of getPinout("breadboard").pins) expect(part.canvas!.pins[pin.id], pin.id).toBeDefined();
  });
});

describe("Breadboard sizes", () => {
  it("has a 170-point mini with no rails and an 830-point full-size with four 50-hole rails", () => {
    const mini = BREADBOARD_SPECS["breadboard-mini"];
    const full = BREADBOARD_SPECS["breadboard-full"];
    expect(mini.holes).toHaveLength(170);
    expect(mini.strips).toHaveLength(34);
    expect(Object.keys(mini.rails)).toEqual([]);
    expect(full.holes).toHaveLength(830);
    expect(full.strips.filter((s) => s.length === 50)).toHaveLength(4);
    expect(full.strips.filter((s) => s.length === 5)).toHaveLength(126);
    for (const spec of [mini, full]) {
      const part = getPart(spec.partId)!;
      expect(part.group).toBe("prototyping");
      for (const h of spec.holes) {
        expect(h.x, h.id).toBeGreaterThan(0);
        expect(h.x, h.id).toBeLessThan(part.size.w);
        expect(h.y, h.id).toBeLessThan(part.size.h);
      }
      for (const pin of getPinout(spec.partId).pins) expect(part.canvas!.pins[pin.id], pin.id).toBeDefined();
    }
  });

  it("feeds the full-size board's top rails and leaves the mini unwired", () => {
    const full = node("full", "breadboard-full", 420, 0);
    const plan = planAutoWire(full, [uno, full], []);
    expect(plan.wires.map((w) => w.to.pin)).toEqual(["TP1", "TN1"]);
    const mini = node("mini", "breadboard-mini", 420, 0);
    expect(planAutoWire(mini, [uno, mini], []).wires).toEqual([]);
  });

  it("joins a full-size rail end to end and reports the strips in use", () => {
    const full = node("full", "breadboard-full", 420, 0);
    const wires = [wire("uno", "5V", "full", "TP1"), wire("uno", "GND1", "full", "TN50")];
    const a = analyze([uno, full], wires);
    expect(a.netOfPin.get("full:TP1")).toBe(a.netOfPin.get("full:TP50"));
    const use = breadboardUse("full", a, [uno, full]);
    expect(use.map((u) => u.name)).toEqual(["Top + rail", "Top − rail"]);
    expect(railSummary(use)).toMatch(/GND/);
  });

  it("joins a mini's columns like any other board", () => {
    const mini = node("mini", "breadboard-mini", 420, 0);
    const a = analyze([mini], []);
    expect(a.netOfPin.get("mini:a17")).toBe(a.netOfPin.get("mini:e17"));
    expect(a.netOfPin.get("mini:a17")).not.toBe(a.netOfPin.get("mini:f17"));
  });
});

describe("Connectivity", () => {
  it("joins a column's five holes and a rail's 25, but not across the channel", () => {
    const a = analyze([bb], []);
    const net = (pin: string) => a.netOfPin.get(`bb:${pin}`);
    expect(net("a7")).toBe(net("e7"));
    expect(net("a7")).not.toBe(net("f7"));
    expect(net("a7")).not.toBe(net("a8"));
    expect(net("TP1")).toBe(net("TP25"));
    expect(net("TP1")).not.toBe(net("TN1"));
    expect(net("TP1")).not.toBe(net("BP1"));
  });

  it("powers three sensors from one 5 V pin through the rails", () => {
    const parts = [node("dht", "dht11"), node("sonar", "hc-sr04"), node("pir", "pir")];
    const wires = [
      ...fed(),
      wire("bb", "TP5", "dht", "VCC"),
      wire("bb", "TN5", "dht", "GND"),
      wire("uno", "D2", "dht", "DATA"),
      wire("bb", "TP9", "sonar", "VCC"),
      wire("bb", "TN9", "sonar", "GND"),
      wire("uno", "D9", "sonar", "TRIG"),
      wire("uno", "D10", "sonar", "ECHO"),
      wire("bb", "TP13", "pir", "VCC"),
      wire("bb", "TN13", "pir", "GND"),
      wire("uno", "D4", "pir", "OUT"),
    ];
    const a = analyze([uno, bb, ...parts], wires);
    for (const p of parts) {
      expect(a.nodes[p.id].status, p.id).toBe("ready");
      expect(a.nodes[p.id].supplyV, p.id).toBe(5);
    }
    // Only one wire leaves the Uno's 5 V pin.
    expect(wires.filter((w) => w.from.node === "uno" && w.from.pin === "5V")).toHaveLength(1);
    expect(a.nodes.bb.status).toBe("ready");
    expect(a.nodes.bb.powered).toBe(false); // the breadboard itself is never a load
    expect(a.nets.find((n) => n.id === a.netOfPin.get("bb:TP1"))!.kind).toBe("power");
    // Its panel and badge say what the rails carry.
    const use = breadboardUse("bb", a, [uno, bb, ...parts]);
    expect(use[0].name).toBe("Top + rail");
    expect(use[0].ends).toEqual(["Arduino Uno 5V", "DHT11 humidity & temperature VCC", "HC-SR04 ultrasonic distance VCC", "PIR motion sensor VCC"]);
    expect(railSummary(use)).toBe("5 V · GND");
  });

  it("links a part to a board pin through a terminal strip", () => {
    const led = node("led", "led");
    const a = analyze([uno, bb, led], [...fed(), wire("uno", "D13", "bb", "a12"), wire("bb", "e12", "led", "A"), wire("bb", "TN20", "led", "C")]);
    expect(a.nodes.led.status).toBe("ready");
    expect(a.nodes.led.links).toContainEqual(expect.objectContaining({ board: "uno", boardPin: "D13", pin: "A" }));
    // A strip on the other side of the channel is not joined.
    const apart = analyze([uno, bb, led], [...fed(), wire("uno", "D13", "bb", "a12"), wire("bb", "f12", "led", "A"), wire("bb", "TN20", "led", "C")]);
    expect(apart.nodes.led.links.some((l) => l.pin === "A")).toBe(false);
  });

  it("flags a short made on a strip, and a rail wired against its stripes", () => {
    const short = analyze([uno, bb], [wire("uno", "5V", "bb", "c3"), wire("uno", "GND1", "bb", "d3")]);
    expect(short.faults.map((f) => f.title)).toContain("Short circuit: power wired straight to ground");
    expect(short.nodes.bb.faults.some((f) => f.severity === "error")).toBe(true);
    const swapped = analyze([uno, bb], [wire("uno", "GND1", "bb", "TP1"), wire("uno", "5V", "bb", "TN1")]);
    const titles = swapped.nodes.bb.faults.map((f) => f.title);
    expect(titles).toContain("GND on the Top + rail");
    expect(titles).toContain("5 V on the Top − rail");
  });

  it("says when a part is on a rail that nothing feeds", () => {
    const dht = node("dht", "dht11");
    const a = analyze([uno, bb, dht], [wire("bb", "BP3", "dht", "VCC"), wire("bb", "BN3", "dht", "GND"), wire("uno", "D2", "dht", "DATA")]);
    const detail = a.nodes.dht.faults.find((f) => f.title === "No power")!.detail;
    expect(detail).toMatch(/breadboard's Bottom \+ rail, which has no supply yet/);
  });
});

describe("Auto-wiring with a breadboard", () => {
  it("feeds the top rails from the board, then takes each part's power from them", () => {
    const plan = planAutoWire(bb, [uno, bb], []);
    expect(plan.board?.id).toBe("uno");
    expect(plan.wires).toEqual([
      { from: { node: "uno", pin: "5V" }, to: { node: "bb", pin: "TP1" } },
      { from: { node: "uno", pin: "GND1" }, to: { node: "bb", pin: "TN1" } },
    ]);
    const wires: LabWire[] = plan.wires.map((w) => ({ id: `w${++seq}`, ...w }));
    const nodes: LabNode[] = [uno, bb];
    const used = new Set<string>();
    for (const [id, partId] of [["dht", "dht11"], ["sonar", "hc-sr04"], ["servo", "servo"]] as const) {
      const part = node(id, partId, 900, 0);
      nodes.push(part);
      const p = planAutoWire(part, nodes, wires);
      const vcc = p.wires.find((w) => w.to.pin === "VCC")!;
      const gnd = p.wires.find((w) => w.to.pin === "GND")!;
      expect(vcc.from.node, id).toBe("bb");
      expect(vcc.from.pin, id).toMatch(/^TP\d+$/);
      expect(gnd.from.node, id).toBe("bb");
      expect(gnd.from.pin, id).toMatch(/^TN\d+$/);
      // A hole takes one wire.
      expect(used.has(vcc.from.pin)).toBe(false);
      used.add(vcc.from.pin);
      // Signals still go straight to the board.
      expect(p.wires.filter((w) => w.from.node === "uno").length, id).toBeGreaterThan(0);
      wires.push(...p.wires.map((w) => ({ id: `w${++seq}`, ...w })));
    }
    const a = analyze(nodes, wires);
    for (const id of ["dht", "sonar", "servo"]) expect(a.nodes[id].status, id).toBe("ready");
    expect(wires.filter((w) => w.from.node === "uno" && w.from.pin === "5V")).toHaveLength(1);
  });

  it("leaves 3.3 V parts on the board's 3.3 V pin when the rail carries 5 V", () => {
    const wires = fed();
    const radio = node("radio", "nrf24l01", 900, 0);
    const p = planAutoWire(radio, [uno, bb, radio], wires);
    expect(p.wires.find((w) => w.to.pin === "VCC")!.from).toEqual({ node: "uno", pin: "3V3" });
    expect(p.wires.find((w) => w.to.pin === "GND")!.from.node).toBe("bb");
  });

  it("is suggested once several parts want 5 V", () => {
    const nodes = [uno, node("dht", "dht11"), node("pir", "pir")];
    const { items } = suggest("", nodes);
    expect(items.find((s) => s.part.id === "breadboard")?.reason).toMatch(/2 parts need 5 V and GND/);
  });
});

describe("On the canvas", () => {
  it("is drawn as itself in every view, Trace included, and never as a 400-row card", () => {
    const three = boardGeometry("breadboard", "reality")!;
    const two = boardGeometry("breadboard", "top")!;
    const trace = boardGeometry("breadboard", "flow")!;
    expect(trace).toBeTruthy();
    expect([two.w, two.h]).toEqual([three.w, three.h]);
    expect(three.view).toEqual({ spin: 0, tilt: 35 });
    expect(Object.keys(three.pins)).toHaveLength(400);
    // Holes far enough apart to aim at.
    expect(three.pins.a2.x - three.pins.a1.x).toBeGreaterThan(10);
    expect(three.pins.b1.y - three.pins.a1.y).toBeGreaterThan(8);
    expect(nodeLayout("breadboard").bare).toBeTruthy();
    expect(nodeFootprint("breadboard").h).toBeLessThan(400);
  });

  it("keeps the breadboard out of the serial monitor", () => {
    const parts = [uno, bb];
    const a = analyze(parts, fed());
    const frame = frameAt(parts, fed(), a, 2, true);
    expect(frame.nodes.bb.badge).toBe("5 V · GND");
    expect(serialLine(parts, frame) ?? "").not.toMatch(/Breadboard/);
  });
});

describe("In the Engineering Lab", () => {
  beforeAll(() => {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", RO);
    vi.stubGlobal("DOMMatrixReadOnly", class {
      m22 = 1;
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 900 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  });
  beforeEach(() => {
    window.localStorage.clear();
    freshLab();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("adds a breadboard fed from the Uno, lights its rails, and lists the strips in use", async () => {
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    fireEvent.click(within(screen.getByTestId("lab-empty")).getByText("Blink an LED"));
    await screen.findAllByTestId("lab-node");
    if (!screen.queryByTestId("lab-search")) fireEvent.click(screen.getByRole("button", { name: "Show components panel" }));
    fireEvent.change(screen.getByTestId("lab-search"), { target: { value: "breadboard" } });
    await act(async () => {
      fireEvent.keyDown(screen.getByTestId("lab-search"), { key: "Enter" });
    });
    const board = (await screen.findAllByTestId("lab-node")).find((n) => n.getAttribute("data-part") === "breadboard")!;
    expect(board).toHaveAttribute("data-breadboard", "true");
    expect(within(board).getByTestId("board-caption")).toHaveTextContent("Breadboard");
    expect(within(board).getAllByLabelText(/hole$/)).toHaveLength(400);
    expect(within(board).getByLabelText("Top + 1 hole").getAttribute("title")).toMatch(/Wired to Arduino Uno 5V/);
    // Both top rails light up in their net's color.
    expect(board.querySelectorAll('[data-lit="true"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Show inspector" }));
    expect(within(await screen.findByTestId("strip-table")).getByText("Top + rail")).toBeInTheDocument();
    // Trace: still the breadboard, drawn as its strips.
    fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
    fireEvent.click(screen.getByRole("radio", { name: /^Trace/ }));
    const traced = (await screen.findAllByTestId("lab-node")).find((n) => n.getAttribute("data-part") === "breadboard")!;
    expect(traced).toHaveAttribute("data-breadboard", "true");
    expect(traced.querySelectorAll("[data-strip]")).toHaveLength(64);
  });
});
