import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PartThumb } from "@kiungo/lab/views/PartThumb";
import { ComponentLibrary } from "@/components/library/ComponentLibrary";
import { PartDetail } from "@/components/library/PartDetail";
import { analyze } from "@kiungo/core/lab/circuit";
import { labKeyFor, setLabOwner, useLab } from "@kiungo/lab/store";
import { StartExperimentButton } from "@/components/library/StartExperimentButton";
import { PartFlowView } from "@kiungo/lab/views/PartFlowView";
import { PartModel3D } from "@kiungo/lab/views/PartModel3D";
import { PartPlanView } from "@kiungo/lab/views/PartPlanView";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { ARTICLES, articleHref } from "@/lib/learning";
import { PARTS, PART_GROUPS, getPart, getPartsByGroup, partHref, searchParts } from "@kiungo/core/parts";
import { CATALOG } from "@kiungo/core/parts/catalog/index";
import { checkPart } from "@kiungo/core/parts/check";
import type { PartModel } from "@kiungo/core/parts/types";

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

/** The ids the backend's v1 catalog returns; the library must cover every one. */
const CATALOGUE_IDS = [
  "buzzer", "dc-motor", "led", "relay", "rgb-led", "servo", "stepper-motor",
  "arduino-mega", "arduino-uno", "microbit", "teensy",
  "hc-05", "lora", "nrf24l01", "wifi-module",
  "lcd-16x2", "oled-ssd1306", "tft-display",
  "esp32", "esp8266",
  "raspberry-pi-4", "raspberry-pi-pico",
  "am2302", "bmp280", "dht11", "dht22", "ds18b20", "hc-sr04", "ldr", "mpu6050", "mq2", "pir", "soil-moisture",
  "stm32",
  "breadboard",
];

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("part models", () => {
  it("covers all 87 catalog parts with unique ids", () => {
    const ids = PARTS.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(87);
    for (const id of CATALOGUE_IDS) expect(getPart(id), id).toBeDefined();
  });

  it("orders the ten groups from boards to radios, each with the part most people reach for first", () => {
    const groups = getPartsByGroup();
    expect(groups.map((entry) => entry.group.id)).toEqual(["boards", "power", "prototyping", "controls", "sensors", "motors", "drivers", "outputs", "displays", "radios"]);
    expect(groups.map((entry) => entry.parts[0].id)).toEqual(["arduino-uno", "battery-4aa", "breadboard", "push-button", "hc-sr04", "servo", "l298n", "led", "lcd-16x2", "hc-05"]);
    expect(groups.map((entry) => entry.parts.length)).toEqual([10, 9, 8, 8, 22, 7, 8, 5, 5, 5]);
    for (const entry of groups) {
      const ranks = entry.parts.map((part) => part.rank);
      expect(ranks, entry.group.id).toEqual([...ranks].sort((a, b) => a - b));
      expect(new Set(ranks).size, entry.group.id).toBe(ranks.length);
    }
    expect(PART_GROUPS.map((group) => group.id)).toEqual(groups.map((entry) => entry.group.id));
  });

  it.each(PARTS.map((part) => [part.id, part] as const))("%s is complete and internally consistent", (_id, part: PartModel) => {
    // The rules live in one place (`parts/check.ts`, also run by `npm run parts:check`): words, body,
    // features, pins, the Trace grid, the engineering data and the simulation wiring.
    const entry = CATALOG.find((item) => item.model.id === part.id)!;
    expect(entry.model).toBe(part);
    expect(
      checkPart(entry)
        .filter((problem) => problem.level === "error")
        .map((problem) => problem.text),
    ).toEqual([]);
    // The diagram has room for five columns, four rows and 18 characters a label.
    for (const block of part.circuit.blocks) {
      expect(block.col).toBeLessThanOrEqual(4);
      expect(block.row).toBeLessThanOrEqual(3);
      expect(block.label.length).toBeLessThanOrEqual(18);
    }
    expect(part.facts.length).toBeGreaterThanOrEqual(4);
    expect(part.spec, "engineering data").toBeDefined();
  });

  it("links only to reference pages that exist", () => {
    const hrefs = new Set(ARTICLES.map((article) => articleHref(article)));
    for (const part of PARTS) {
      if (part.docs) expect(hrefs.has(part.docs), `${part.id} → ${part.docs}`).toBe(true);
    }
    expect(PARTS.filter((part) => part.docs).length).toBeGreaterThanOrEqual(5);
  });

  it("searches by name, alias, tag and interface, best match first", () => {
    expect(searchParts("")).toHaveLength(87);
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

  it("renders the 3D model as a focusable, labeled scene, lit as the part is powered", () => {
    render(<PartModel3D model={uno} powered />);
    const scene = screen.getByTestId("part-3d");
    expect(scene).toHaveAttribute("role", "group");
    expect(scene).toHaveAttribute("aria-roledescription", "interactive 3D model");
    expect(scene).toHaveAttribute("tabindex", "0");
    expect(scene).toHaveAttribute("data-powered");
    expect(scene.getAttribute("data-lit")?.split(" ")).toContain("led-on");
    // Without WebGL (as in jsdom) the part is still shown: its top view.
    expect(scene.querySelector('[aria-label="Arduino Uno, top view"]')).not.toBeNull();
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
    expect(screen.getByRole("img", { name: /Top view of the Arduino Uno, 68.6 by 53.4 millimeters/ })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(uno.features.length);
    fireEvent.click(screen.getByRole("button", { name: /USB-B port/ }));
    expect(onFeature).toHaveBeenCalledWith("usb");
    fireEvent.keyDown(screen.getByRole("button", { name: /Barrel jack/ }), { key: "Enter" });
    expect(onFeature).toHaveBeenCalledWith("jack");
  });

  it("draws front-facing parts like the LED standing up, legs included", () => {
    render(<PartPlanView model={led} powered activeFeature="anode" onFeature={() => {}} />);
    expect(screen.getByRole("img", { name: /Front view of the LED, 5 mm, 6 by [\d.]+ millimeters/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anode/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the circuit blocks, explains them on hover and animates current only when powered", () => {
    const { rerender } = render(<PartFlowView model={servo} powered={false} />);
    expect(screen.getByText(/Switch the power on to see current flow/)).toBeInTheDocument();
    expect(document.querySelector(".hhip-flow-dash")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Position pot/ }));
    // The note shows beside the diagram, and on the part where the block sits.
    expect(screen.getAllByText(/The feedback: a potentiometer on the output gear/).length).toBeGreaterThan(0);
    rerender(<PartFlowView model={servo} powered />);
    // Every link flows in the diagram, and again on the part wherever both its ends are placed.
    const placed = new Set(servo.circuit.blocks.filter((block) => block.at !== undefined).map((block) => block.id));
    const onPart = servo.circuit.links.filter((link) => placed.has(link.from) && placed.has(link.to)).length;
    expect(document.querySelectorAll(".hhip-flow-dash").length).toBe(servo.circuit.links.length + onPart);
    expect(screen.getAllByRole("listitem")).toHaveLength(servo.circuit.steps.length);
  });
});

describe("PartDetail", () => {
  it("switches between the three views and toggles power", () => {
    render(<PartDetail part={getPart("servo")!} compatible={["Arduino Uno", "ESP32"]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Servo, SG90" })).toBeInTheDocument();
    expect(screen.getByTestId("part-3d")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^2D/ }));
    expect(screen.getByTestId("part-plan")).toBeInTheDocument();
    expect(screen.queryByTestId("part-3d")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Mechanical Horn" }));
    expect(screen.getByText(/The white arm that turns/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Trace/ }));
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
    setLabOwner("acct-1");
    useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [] });
  });
  afterEach(() => setLabOwner(null));

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
    expect(JSON.parse(window.localStorage.getItem(labKeyFor("acct-1"))!).sessions).toHaveLength(1);
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
    expect(groupHeadings).toEqual(["Boards", "Power", "Breadboards and basics", "Buttons and controls", "Sensors", "Motors and servos", "Drivers and switches", "Lights and sound", "Displays", "Radios and tags"]);
    const boards = within(nav).getByRole("region", { name: "Boards" });
    expect(within(boards).getAllByRole("button")[0]).toHaveTextContent("Arduino Uno");
    expect(replace).toHaveBeenLastCalledWith("/components?part=dht11", { scroll: false });

    fireEvent.click(within(nav).getByRole("button", { name: /Servo, SG90/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Servo, SG90" })).toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith("/components?part=servo", { scroll: false });
  });

  it("filters the list by search and says how many match", () => {
    render(<ComponentLibrary initialQuery="nrf24" />);
    expect(screen.getByText(/part matches “nrf24”/).parentElement).toHaveTextContent("1part matches “nrf24”");
    const nav = screen.getByRole("navigation");
    expect(within(nav).getAllByRole("button")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: /Search parts/ }), { target: { value: "no such part" } });
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: /Search parts/ }), { target: { value: "" } });
    expect(screen.getByText(/87 parts in 10 groups, most common first/)).toBeInTheDocument();
  });

  it("has one clear button, removes the search icon while typing, and clears on Escape", () => {
    render(<ComponentLibrary />);
    const box = screen.getByRole("searchbox", { name: /Search parts/ });
    expect(screen.getByTestId("library-search-icon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    fireEvent.change(box, { target: { value: "bre" } });
    expect(screen.queryByTestId("library-search-icon")).toBeNull();
    expect(box.className).toMatch(/pl-3\.5/);
    expect(screen.getAllByRole("button", { name: "Clear search" })).toHaveLength(1);
    expect(screen.getByText(/parts match “bre”/)).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveValue("");
    expect(screen.getByTestId("library-search-icon")).toBeInTheDocument();
    // The browser's own × is hidden for every search box, so ours is the only one.
    const css = readFileSync(join(process.cwd(), "packages/ui/src/theme.css"), "utf8");
    expect(css).toMatch(/input\[type="search"\]::-webkit-search-cancel-button[\s\S]*?display: none/);
  });

  it("draws a breadboard's thumbnail with its holes and rail stripes, not a blank slab", () => {
    const { container } = render(<PartThumb model={getPart("breadboard")!} />);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(3);
  });

  it("falls back to the first part when the address names one that does not exist", () => {
    render(<ComponentLibrary initialPart="flux-capacitor" />);
    expect(screen.getByRole("heading", { level: 2, name: "Arduino Uno" })).toBeInTheDocument();
  });
});
