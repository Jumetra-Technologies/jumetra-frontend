import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ComponentLibrary } from "@/components/library/ComponentLibrary";
import { PartDetail } from "@/components/library/PartDetail";
import { analyze } from "@/lib/lab/circuit";
import { LAB_STORAGE_KEY, useLab } from "@/lib/lab/store";
import { StartExperimentButton } from "@/components/library/StartExperimentButton";
import { PartFlowView } from "@/components/library/views/PartFlowView";
import { PartModel3D } from "@/components/library/views/PartModel3D";
import { PartPlanView } from "@/components/library/views/PartPlanView";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ARTICLES, articleHref } from "@/lib/learning";
import { PARTS, PART_GROUPS, getPart, getPartsByGroup, partHref, searchParts } from "@/lib/parts";
import type { PartModel, Solid } from "@/lib/parts/types";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

const createEngineeringWorkspace = vi.fn();
const addWorkspaceNode = vi.fn();
const createComponentV2Binding = vi.fn();
vi.mock("@/lib/api-client", () => ({
  api: {
    createEngineeringWorkspace: (...args: unknown[]) => createEngineeringWorkspace(...args),
    addWorkspaceNode: (...args: unknown[]) => addWorkspaceNode(...args),
    createComponentV2Binding: (...args: unknown[]) => createComponentV2Binding(...args),
  },
}));

/** The ids the backend's v1 catalogue returns; the library must cover every one. */
const CATALOGUE_IDS = [
  "buzzer", "dc-motor", "led", "relay", "rgb-led", "servo", "stepper-motor",
  "arduino-mega", "arduino-uno", "microbit", "teensy",
  "hc-05", "lora", "nrf24l01", "wifi-module",
  "lcd-16x2", "oled-ssd1306", "tft-display",
  "esp32", "esp8266",
  "raspberry-pi-4", "raspberry-pi-pico",
  "am2302", "bmp280", "dht11", "dht22", "ds18b20", "hc-sr04", "ldr", "mpu6050", "mq2", "pir", "soil-moisture",
  "stm32",
];

function footprintOf(solid: Solid): { x1: number; y1: number; x2: number; y2: number } | null {
  switch (solid.kind) {
    case "box":
      return { x1: solid.x, y1: solid.y, x2: solid.x + solid.w, y2: solid.y + solid.h };
    case "cyl":
    case "dome":
      return { x1: solid.cx - solid.r, y1: solid.cy - solid.r, x2: solid.cx + solid.r, y2: solid.cy + solid.r };
    default:
      return null;
  }
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("part models", () => {
  it("covers all 34 catalogue parts with unique ids", () => {
    const ids = PARTS.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(34);
    for (const id of CATALOGUE_IDS) expect(getPart(id), id).toBeDefined();
  });

  it("orders groups as boards, sensors, outputs, displays, radios with the most common part first", () => {
    const groups = getPartsByGroup();
    expect(groups.map((entry) => entry.group.id)).toEqual(["boards", "sensors", "outputs", "displays", "radios"]);
    expect(groups.map((entry) => entry.parts[0].id)).toEqual(["arduino-uno", "dht11", "led", "lcd-16x2", "hc-05"]);
    for (const entry of groups) {
      const ranks = entry.parts.map((part) => part.rank);
      expect(ranks, entry.group.id).toEqual([...ranks].sort((a, b) => a - b));
      expect(new Set(ranks).size, entry.group.id).toBe(ranks.length);
    }
    expect(PART_GROUPS.map((group) => group.id)).toEqual(groups.map((entry) => entry.group.id));
  });

  it.each(PARTS.map((part) => [part.id, part] as const))("%s is complete and internally consistent", (_id, part: PartModel) => {
    expect(part.summary.length).toBeGreaterThan(40);
    expect(part.solids.length).toBeGreaterThanOrEqual(3);
    expect(part.features.length).toBeGreaterThanOrEqual(2);
    expect(part.pins.length).toBeGreaterThanOrEqual(2);
    expect(part.facts.length).toBeGreaterThanOrEqual(5);
    expect(part.tags.length).toBeGreaterThanOrEqual(3);
    expect(part.experiment.title).toBeTruthy();
    expect(part.experiment.idea.length).toBeGreaterThan(30);
    expect(part.size.w).toBeGreaterThan(0);
    expect(part.size.h).toBeGreaterThan(0);
    expect(part.size.d).toBeGreaterThan(0);

    // Solids stay close to the stated footprint (connectors may overhang a little).
    const slack = Math.max(part.size.w, part.size.h) * 0.35;
    for (const solid of part.solids) {
      const box = footprintOf(solid);
      if (!box) continue;
      expect(box.x1).toBeGreaterThanOrEqual(-slack);
      expect(box.y1).toBeGreaterThanOrEqual(-slack);
      expect(box.x2).toBeLessThanOrEqual(part.size.w + slack);
      expect(box.y2).toBeLessThanOrEqual(part.size.h + slack);
      if (solid.kind === "box" || solid.kind === "cyl" || solid.kind === "dome") expect((solid.z ?? 0) + solid.d).toBeLessThanOrEqual(part.size.d + 0.01);
    }

    // Features have unique ids, sizes, and notes a person can read.
    const featureIds = part.features.map((feature) => feature.id);
    expect(new Set(featureIds).size).toBe(featureIds.length);
    for (const feature of part.features) {
      expect(feature.w).toBeGreaterThan(0);
      expect(feature.h).toBeGreaterThan(0);
      expect(feature.note.length).toBeGreaterThan(15);
    }

    // The circuit is a graph whose links all resolve, laid out on a small grid.
    const blockIds = part.circuit.blocks.map((block) => block.id);
    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(part.circuit.blocks.length).toBeGreaterThanOrEqual(4);
    expect(part.circuit.links.length).toBeGreaterThanOrEqual(3);
    const cells = new Set<string>();
    for (const block of part.circuit.blocks) {
      expect(block.col).toBeLessThanOrEqual(4);
      expect(block.row).toBeLessThanOrEqual(3);
      expect(block.label.length).toBeLessThanOrEqual(18);
      expect(cells.has(`${block.col},${block.row}`), `${block.id} overlaps another block`).toBe(false);
      cells.add(`${block.col},${block.row}`);
    }
    for (const link of part.circuit.links) {
      expect(blockIds, `${part.id}: link from ${link.from}`).toContain(link.from);
      expect(blockIds, `${part.id}: link to ${link.to}`).toContain(link.to);
    }
    expect(part.circuit.steps.length).toBeGreaterThanOrEqual(3);

    // Animated ids point at real solids.
    const solidIds = new Set(part.solids.map((solid) => ("id" in solid ? solid.id : undefined)).filter(Boolean));
    for (const id of [...(part.animate?.lit ?? []), ...(part.animate?.spin ?? []), ...(part.animate?.sweep ?? [])]) {
      expect(solidIds.has(id), `${part.id}: animate id ${id}`).toBe(true);
    }
  });

  it("links only to reference pages that exist", () => {
    const hrefs = new Set(ARTICLES.map((article) => articleHref(article)));
    for (const part of PARTS) {
      if (part.docs) expect(hrefs.has(part.docs), `${part.id} → ${part.docs}`).toBe(true);
    }
    expect(PARTS.filter((part) => part.docs).length).toBeGreaterThanOrEqual(5);
  });

  it("searches by name, alias, tag and interface, best match first", () => {
    expect(searchParts("")).toHaveLength(34);
    expect(searchParts("uno")[0].id).toBe("arduino-uno");
    expect(searchParts("GY-521")[0].id).toBe("mpu6050");
    expect(searchParts("photoresistor")[0].id).toBe("ldr");
    expect(searchParts("i2c").map((part) => part.id)).toEqual(expect.arrayContaining(["lcd-16x2", "oled-ssd1306", "mpu6050", "bmp280"]));
    expect(searchParts("motor sg90")[0].id).toBe("servo");
    expect(searchParts("zzzz")).toHaveLength(0);
    expect(partHref("hc-sr04")).toBe("/components?part=hc-sr04");
  });
});

describe("SegmentedControl", () => {
  it("is a radiogroup that changes with clicks and arrow keys", () => {
    const onChange = vi.fn();
    render(<SegmentedControl value="a" label="View" options={[{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }]} onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(within(group).getByRole("radio", { name: "A" })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: "C" }));
    expect(onChange).toHaveBeenLastCalledWith("c");
    fireEvent.keyDown(within(group).getByRole("radio", { name: "A" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.keyDown(within(group).getByRole("radio", { name: "A" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
});

describe("part views", () => {
  const uno = getPart("arduino-uno")!;
  const led = getPart("led")!;
  const servo = getPart("servo")!;

  it("renders the 3D model as a focusable, labelled scene with every solid", () => {
    render(<PartModel3D model={uno} powered />);
    const scene = screen.getByTestId("part-3d");
    expect(scene).toHaveAttribute("role", "group");
    expect(scene).toHaveAttribute("aria-roledescription", "interactive 3D model");
    expect(scene).toHaveAttribute("tabindex", "0");
    expect(scene.querySelector('[data-solid="pcb"]')).not.toBeNull();
    expect(scene.querySelector('[data-solid="led-on"]')).not.toBeNull();
  });

  it("renders every part in all three views without throwing", () => {
    for (const part of PARTS) {
      const { unmount } = render(
        <>
          <PartModel3D model={part} powered />
          <PartPlanView model={part} powered activeFeature={null} onFeature={() => {}} />
          <PartFlowView model={part} powered />
        </>,
      );
      expect(screen.getByTestId("part-3d")).toBeInTheDocument();
      expect(screen.getByTestId("part-plan")).toBeInTheDocument();
      expect(screen.getByTestId("part-flow")).toBeInTheDocument();
      unmount();
    }
  });

  it("draws the top view with dimensions and a clickable outline per feature", () => {
    const onFeature = vi.fn();
    render(<PartPlanView model={uno} powered activeFeature={null} onFeature={onFeature} />);
    expect(screen.getByRole("img", { name: /Top view of the Arduino Uno, 68.6 by 53.4 millimetres/ })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(uno.features.length);
    fireEvent.click(screen.getByRole("button", { name: /USB-B port/ }));
    expect(onFeature).toHaveBeenCalledWith("usb");
    fireEvent.keyDown(screen.getByRole("button", { name: /Barrel jack/ }), { key: "Enter" });
    expect(onFeature).toHaveBeenCalledWith("jack");
  });

  it("draws front-facing parts like the LED standing up, legs included", () => {
    render(<PartPlanView model={led} powered activeFeature="anode" onFeature={() => {}} />);
    expect(screen.getByRole("img", { name: /Front view of the LED, 5 mm, 6 by 21.8 millimetres/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anode/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the circuit blocks, explains them on hover and animates current only when powered", () => {
    const { rerender } = render(<PartFlowView model={servo} powered={false} />);
    expect(screen.getByText(/Switch the power on to see current flow/)).toBeInTheDocument();
    expect(document.querySelector(".hhip-flow-dash")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Position pot/ }));
    expect(screen.getByText(/The feedback: a potentiometer on the output gear/)).toBeInTheDocument();
    rerender(<PartFlowView model={servo} powered />);
    expect(document.querySelectorAll(".hhip-flow-dash").length).toBe(servo.circuit.links.length);
    expect(screen.getAllByRole("listitem")).toHaveLength(servo.circuit.steps.length);
  });
});

describe("PartDetail", () => {
  it("switches between the three views and toggles power", () => {
    render(<PartDetail part={getPart("servo")!} compatible={["Arduino Uno", "ESP32"]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Servo, SG90" })).toBeInTheDocument();
    expect(screen.getByTestId("part-3d")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Top view/ }));
    expect(screen.getByTestId("part-plan")).toBeInTheDocument();
    expect(screen.queryByTestId("part-3d")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Mechanical Horn" }));
    expect(screen.getByText(/Screws onto the splined shaft/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Current flow/ }));
    expect(screen.getByTestId("part-flow")).toBeInTheDocument();
    const power = screen.getByTestId("power-switch");
    expect(power).toHaveAttribute("aria-checked", "true");
    fireEvent.click(power);
    expect(power).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Works with/).closest("p")).toHaveTextContent("Works with Arduino Uno, ESP32.");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reference page" })).toHaveAttribute("href", "/docs/hardware-knowledge/servo-motor");
  });
});

describe("StartExperimentButton", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [] });
  });

  it("opens a new lab session with an Uno wired to the part, without the backend", () => {
    render(<StartExperimentButton part={getPart("hc-sr04")!} />);
    fireEvent.click(screen.getByTestId("start-experiment"));
    const { sessions, activeId } = useLab.getState();
    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(activeId).toBe(session.id);
    expect(session.name).toBe("HC-SR04 ultrasonic distance: Parking sensor");
    expect(session.nodes.map((n) => n.partId)).toEqual(["arduino-uno", "hc-sr04"]);
    // VCC, Trig, Echo and GND, all landing on the Uno.
    expect(session.wires).toHaveLength(4);
    const analysis = analyze(session.nodes, session.wires);
    expect(analysis.nodes[session.nodes[1].id].status).toBe("ready");
    expect(push).toHaveBeenCalledWith(`/laboratory/workspace?session=${session.id}`);
    expect(createEngineeringWorkspace).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(LAB_STORAGE_KEY)!).sessions).toHaveLength(1);
  });

  it("puts a board on its own", () => {
    render(<StartExperimentButton part={getPart("esp32")!} />);
    fireEvent.click(screen.getByTestId("start-experiment"));
    expect(useLab.getState().sessions[0].nodes.map((n) => n.partId)).toEqual(["esp32"]);
    expect(addWorkspaceNode).not.toHaveBeenCalled();
  });
});

describe("ComponentLibrary", () => {
  it("lists every group most common first, selects a part and keeps the address in step", () => {
    render(<ComponentLibrary initialPart="dht11" compatibility={{ dht11: ["Arduino Uno"] }} />);
    expect(screen.getByRole("heading", { level: 2, name: /DHT11/ })).toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    const groupHeadings = within(nav).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(groupHeadings).toEqual(["Boards", "Sensors", "Outputs and motors", "Displays", "Radios"]);
    const boards = within(nav).getByRole("region", { name: "Boards" });
    expect(within(boards).getAllByRole("button")[0]).toHaveTextContent("Arduino Uno");
    expect(replace).toHaveBeenLastCalledWith("/components?part=dht11", { scroll: false });

    fireEvent.click(within(nav).getByRole("button", { name: /Servo, SG90/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Servo, SG90" })).toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith("/components?part=servo", { scroll: false });
  });

  it("filters the list by search and says how many match", () => {
    render(<ComponentLibrary initialQuery="nrf24" />);
    expect(screen.getByText(/1 part matches/)).toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getAllByRole("button")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: /Search parts/ }), { target: { value: "no such part" } });
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: /Search parts/ }), { target: { value: "" } });
    expect(screen.getByText(/34 parts in 5 groups, most common first/)).toBeInTheDocument();
  });

  it("falls back to the first part when the address names one that does not exist", () => {
    render(<ComponentLibrary initialPart="flux-capacitor" />);
    expect(screen.getByRole("heading", { level: 2, name: "Arduino Uno" })).toBeInTheDocument();
  });
});
