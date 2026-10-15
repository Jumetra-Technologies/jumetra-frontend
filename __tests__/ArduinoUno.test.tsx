import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { boardGeometry, BOARD_SCALE, BOARD_VIEW } from "@/lib/lab/board-geometry";
import { nodeLayout } from "@/lib/lab/layout";
import { getPinout } from "@/lib/lab/pinout";
import { getPart } from "@/lib/parts";
import { project, projectAngle, stageLift } from "@/lib/parts/geometry";
import { ARDUINO_UNO } from "@/lib/parts/models/arduino-uno";
import { freshLab } from "./helpers/lab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const uno = getPart("arduino-uno")!;
const texts = () => uno.solids.filter((s) => s.kind === "text").map((s) => (s as { text: string }).text);

describe("The Arduino Uno model", () => {
  it("is the real R3: 68.6 × 53.4 mm, teal, USB-B on the left edge, the 328P socketed bottom right", () => {
    expect(uno).toBe(ARDUINO_UNO);
    expect(uno.size).toMatchObject({ w: 68.6, h: 53.4 });
    const pcb = uno.solids.find((s) => s.kind === "box" && s.id === "pcb") as { top: string };
    expect(pcb.top).toBe("#0f8b8e");
    const usb = uno.solids.find((s) => s.kind === "box" && s.id === "usb") as { x: number; y: number; w: number; h: number };
    expect(usb.x).toBeLessThan(0); // overhangs the edge
    expect(usb.y + usb.h / 2).toBeCloseTo(13.8, 0);
    const mcu = uno.features.find((f) => f.id === "mcu")!;
    expect(mcu.x).toBeGreaterThan(29);
    expect(mcu.y).toBeGreaterThan(33);
    expect(mcu.w).toBeCloseTo(35.6, 1);
  });

  it("carries the functional silkscreen only: no Kiungo branding, and no Arduino logo or wordmark", () => {
    const all = texts().join(" ");
    expect(all).not.toMatch(/Kiungo/i);
    expect(all).not.toMatch(/ARDUINO|UNO/);
    for (const label of ["DIGITAL (PWM~)", "POWER", "ANALOG IN", "L", "TX", "RX", "ON", "ICSP", "RESET", "AREF", "~11", "A0", "A5", "Vin", "3.3V", "5V", "GND"]) expect(texts()).toContain(label);
  });

  it("puts every lab pin on a header hole at 0.1 in pitch, where the real header is", () => {
    const pins = uno.canvas!.pins;
    for (const pin of getPinout("arduino-uno").pins) expect(pins[pin.id], pin.id).toBeDefined();
    // Digital 13…8 sit on the 10-pin header along the top, 2.54 mm apart; 7…0 after the 1.6 mm gap.
    expect(pins.D12.x - pins.D13.x).toBeCloseTo(2.54, 2);
    expect(pins.D7.x - pins.D8.x).toBeCloseTo(2.54 + 1.6 - 0.1, 0);
    expect(pins.D13.y).toBeCloseTo(2.07, 2);
    // A0…A5 along the bottom; 5 V and GND on the power header beside them.
    expect(pins.A1.x - pins.A0.x).toBeCloseTo(2.54, 2);
    expect(pins.A0.y).toBeCloseTo(51.27, 2);
    expect(pins.GND1.x).toBeLessThan(pins.A0.x);
    expect(pins["5V"].x).toBeLessThan(pins.GND1.x);
    // The ICSP's 5 V is on the 2 × 3 header at the right edge, and the top-header GND is beside pin 13.
    expect(pins["5V_ICSP"].x).toBeGreaterThan(66);
    expect(pins.GND3.x).toBeCloseTo(pins.D13.x - 2.54, 2);
    expect(uno.canvas!.usb).toMatchObject({ from: "left" });
    expect(uno.canvas!.usb!.x).toBeLessThan(0);
  });
});

describe("Projecting the 3D view", () => {
  it("is the identity (plus the lift) with no tilt or spin, and shortens y by cos(tilt) when tilted", () => {
    const s = 4;
    const flat = project(uno, s, { spin: 0, tilt: 0 }, { x: 0, y: 0, z: 0 });
    expect(flat.x).toBeCloseTo(-uno.size.w / 2 * s, 6);
    expect(flat.y).toBeCloseTo(-uno.size.h / 2 * s + stageLift(uno, s), 6);
    const tilted = project(uno, s, { spin: 0, tilt: 60 }, { x: uno.size.w / 2, y: uno.size.h / 2 + 10, z: 0 });
    expect(tilted.y - stageLift(uno, s)).toBeCloseTo(10 * s * Math.cos(Math.PI / 3), 6);
    // Height comes up the screen.
    const up = project(uno, s, { spin: 0, tilt: 60 }, { x: uno.size.w / 2, y: uno.size.h / 2, z: 10 });
    expect(up.y - stageLift(uno, s)).toBeCloseTo(-10 * s * Math.sin(Math.PI / 3), 6);
    expect(projectAngle(uno, s, { spin: -24, tilt: 0 }, { x: 1, y: 0 })).toBeCloseTo(-24, 6);
  });
});

describe("The Uno on the canvas", () => {
  it("is drawn bare in 2D and 3D, the same size in both, and as a card in Trace", () => {
    const two = boardGeometry("arduino-uno", "top")!;
    const three = boardGeometry("arduino-uno", "reality")!;
    expect(boardGeometry("arduino-uno", "flow")).toBeNull();
    expect(boardGeometry("led", "top")).toBeNull();
    expect([two.w, two.h]).toEqual([three.w, three.h]);
    expect(two.scale).toBe(BOARD_SCALE);
    // 2D: pins keep the board's geometry, scaled.
    expect(two.pins.D12.x - two.pins.D13.x).toBeCloseTo(2.54 * BOARD_SCALE, 3);
    expect(two.pins.D13.y).toBeLessThan(two.pins.A0.y);
    expect(two.pins.D13.position).toBe("top");
    expect(two.pins.A0.position).toBe("bottom");
    expect(two.usb!.angle).toBe(-90); // the lead comes in from the left
    expect(two.usb!.x).toBeLessThan(two.pins.D13.x);
    // 3D: pins land where project() says the hole top is.
    const p = project(uno, BOARD_SCALE, BOARD_VIEW, { ...uno.canvas!.pins.D13, z: 1.6 + 8.5 });
    expect(three.pins.D13.x).toBeCloseTo(three.graphic.left + three.graphic.width / 2 + p.x, 6);
    expect(three.pins.D13.y).toBeCloseTo(three.graphic.top + three.graphic.height / 2 + p.y, 6);
    expect(three.usb!.angle).toBeCloseTo(projectAngle(uno, BOARD_SCALE, BOARD_VIEW, { x: -1, y: 0 }) + 90, 6);
    expect(nodeLayout("arduino-uno", "top").bare).toBeTruthy();
    expect(nodeLayout("arduino-uno", "flow").bare).toBeUndefined();
    expect(nodeLayout("arduino-uno").bare).toBeUndefined();
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

  it("shows the Uno as itself with a handle on each header hole and the USB lead in the real jack; the LED keeps its card; Trace keeps the card", async () => {
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    fireEvent.click(within(screen.getByTestId("lab-empty")).getByText("Blink an LED"));
    const nodes = await screen.findAllByTestId("lab-node");
    const board = nodes.find((n) => n.getAttribute("data-part") === "arduino-uno")!;
    const led = nodes.find((n) => n.getAttribute("data-part") === "led")!;
    expect(board).toHaveAttribute("data-bare", "true");
    expect(led).not.toHaveAttribute("data-bare");
    expect(within(board).getByTestId("board-caption")).toHaveTextContent("Arduino Uno");
    const d13 = within(board).getByLabelText("D13 SCK pin");
    expect(d13.style.left).not.toBe("");
    expect(d13.style.top).not.toBe("");
    expect(d13.getAttribute("title")).toMatch(/Wired to LED/);
    expect(within(board).getByTestId("usb-cable")).toHaveAttribute("data-anchored", "true");
    expect(within(board).getByTestId("usb-cable")).toHaveAttribute("data-connector", "usb-b");
    // The lead points into the jack from the left: rotated −90°.
    expect(within(board).getByTestId("usb-cable").style.transform).toBe("rotate(-90deg)");
    // Trace: the card with pin rails, as before.
    fireEvent.click(screen.getByRole("radio", { name: /^Trace/ }));
    const traced = (await screen.findAllByTestId("lab-node")).find((n) => n.getAttribute("data-part") === "arduino-uno")!;
    expect(traced).not.toHaveAttribute("data-bare");
    // Run: the lead reports power the same way.
    fireEvent.click(screen.getByRole("radio", { name: /^3D/ }));
    await act(async () => {
      fireEvent.click(screen.getByTestId("run-toggle"));
    });
    const lead = (await screen.findAllByTestId("usb-cable"))[0];
    expect(lead).toHaveAttribute("data-state", "on");
    expect(screen.getByTestId("usb-tag")).toHaveTextContent("USB-B · 5 V");
  });
});
