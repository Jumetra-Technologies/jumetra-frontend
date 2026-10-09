/**
 * Content model for the System Architecture Explorer (spec feature 7.5).
 *
 * Phases describe the plan from the Phase One spec. `code` describes what
 * exists in the two repositories today, so contributors can see both.
 */

export type LayerId = "web" | "desktop" | "comm" | "virtual" | "physical";
export type ViewId = "phase1" | "now" | "phase2";
export type CodeStatus = "live" | "prototype" | "experimental" | "not-started";
/** How a layer or relationship is drawn in a given view. */
export type PresenceState = "active" | "partial" | "planned";

export interface PageLink {
  href: string;
  label: string;
}

export interface Layer {
  id: LayerId;
  name: string;
  /** Short role, shown on the board under the name. */
  role: string;
  summary: string;
  /** Which spec phase introduces this layer. */
  phase: 1 | 2;
  responsibilities: string[];
  code: {
    status: CodeStatus;
    text: string;
    endpoints?: string[];
    links?: PageLink[];
  };
}

export interface Relationship {
  id: string;
  from: LayerId;
  to: LayerId;
  label: string;
  carries: string;
  /** Status in the code today; `undefined` means not built. */
  code?: Exclude<CodeStatus, "not-started" | "live">;
}

export interface View {
  id: ViewId;
  label: string;
  description: string;
}

export type FlowStep =
  | { kind: "node"; layer: LayerId; text: string }
  | { kind: "edge"; from: LayerId; to: LayerId; text: string };

export interface DataFlow {
  id: string;
  title: string;
  summary: string;
  view: ViewId;
  steps: FlowStep[];
}

export const LAYERS: Layer[] = [
  {
    id: "web",
    name: "Web Platform",
    role: "Learn, plan, document",
    summary:
      "The browser app you are using now. People learn how Kiungo works, explore hardware, organise projects and record experiments here before they touch real devices.",
    phase: 1,
    responsibilities: [
      "Documentation and the Learning Center",
      "Hardware library with specs and pinouts",
      "Projects and experiment records, exported as Markdown reports",
      "Screens for the backend's lab, firmware and hybrid features",
    ],
    code: {
      status: "live",
      text: "Next.js app in jumetra-frontend. Projects and experiment records are saved in your browser; the lab, firmware and hybrid screens call the backend.",
      links: [
        { href: "/learn", label: "Learning Center" },
        { href: "/workspace", label: "Projects" },
        { href: "/experiments", label: "Experiment Records" },
      ],
    },
  },
  {
    id: "desktop",
    name: "Desktop Application",
    role: "Offline engineering",
    summary:
      "The Phase Two app that turns Kiungo from a knowledge platform into an operational hardware environment that runs next to the devices on your bench.",
    phase: 2,
    responsibilities: [
      "Run the simulation engine on your own machine",
      "Talk to boards and manage devices directly",
      "Keep working offline, then sync",
      "Monitor experiments in real time",
    ],
    code: {
      status: "not-started",
      text: "Nothing exists in either repository yet. The capabilities above come from the spec's Phase Two plan.",
      links: [{ href: "/roadmap", label: "Roadmap" }],
    },
  },
  {
    id: "comm",
    name: "Communication Layer",
    role: "HTTP, WebSocket and serial",
    summary:
      "Everything that moves data between the apps and the hardware: requests from the interface, live update streams and the serial link to boards.",
    phase: 2,
    responsibilities: [
      "JSON requests over HTTP for parts, firmware and experiments",
      "WebSocket streams for events, hardware state, wiring and firmware logs",
      "USB serial at 115200 baud to physical boards",
      "Device discovery and handshake when a board is plugged in",
    ],
    code: {
      status: "prototype",
      text: "The FastAPI backend in Jumetra-Backend: 17 routers and 7 WebSocket endpoints, on port 8000 when you run it locally.",
      endpoints: ["/ws/events", "/ws/hardware", "/ws/workspace/{id}", "/discovery/scan"],
      links: [{ href: "/docs/technical-guides/api-and-environment", label: "API and environment guide" }],
    },
  },
  {
    id: "virtual",
    name: "Virtual Hardware",
    role: "Simulated parts",
    summary:
      "Software stand-ins for real parts. A virtual DHT11 reports temperature, a virtual servo turns, and the circuit they sit in is checked for wiring mistakes.",
    phase: 2,
    responsibilities: [
      "Behaviour models for sensors and actuators",
      "Circuit graph and wiring validation",
      "Time-stepped simulation you can start, step and stop",
      "Component catalog with metadata and SVG drawings",
    ],
    code: {
      status: "prototype",
      text: "The backend simulation engine, with behaviour models for parts such as the DHT11, HC-SR04 and PIR sensor. The Laboratory and the engineering canvas drive it.",
      endpoints: ["/laboratory/{id}/simulation/advance", "/components/v2/{id}/simulate"],
      links: [
        { href: "/laboratory/workspace", label: "Engineering Lab" },
        { href: "/components", label: "Component library" },
      ],
    },
  },
  {
    id: "physical",
    name: "Physical Hardware",
    role: "Real boards and sensors",
    summary:
      "The Arduino and ESP32 boards on your bench, and the sensors and actuators wired to them.",
    phase: 2,
    responsibilities: [
      "Boards detected when plugged in over USB",
      "Kiungo device agent firmware for the Arduino Uno and ESP32",
      "Sketches compiled with arduino-cli and uploaded",
      "Readings streamed back as a live digital twin",
    ],
    code: {
      status: "experimental",
      text: "Discovery, firmware upload and the hybrid bridge live in the backend. Set HHIP_FIRMWARE_DRY_RUN=1 to rehearse uploads without a board. Device discovery still has an open bug when a serial device is probed.",
      endpoints: ["/firmware/upload", "/hybrid/devices/connect"],
      links: [
        { href: "/firmware", label: "Firmware" },
        { href: "/hybrid", label: "Hybrid Hardware" },
      ],
    },
  },
];

export const RELATIONSHIPS: Relationship[] = [
  {
    id: "web-desktop",
    from: "web",
    to: "desktop",
    label: "Project sync",
    carries: "Projects, documentation and experiment records shared between the two apps.",
  },
  {
    id: "web-comm",
    from: "web",
    to: "comm",
    label: "HTTP + WebSocket",
    carries: "Requests for parts, firmware and experiments go out. Live state streams back.",
    code: "prototype",
  },
  {
    id: "desktop-comm",
    from: "desktop",
    to: "comm",
    label: "Local link",
    carries: "The desktop app reaches devices and the simulator from your own machine, so it can work offline.",
  },
  {
    id: "comm-virtual",
    from: "comm",
    to: "virtual",
    label: "Simulation",
    carries: "Commands to start, step and stop a simulation. Part states come back.",
    code: "prototype",
  },
  {
    id: "comm-physical",
    from: "comm",
    to: "physical",
    label: "USB serial",
    carries: "Firmware and commands go to the board. Readings and logs come back at 115200 baud.",
    code: "experimental",
  },
  {
    id: "virtual-physical",
    from: "virtual",
    to: "physical",
    label: "Hybrid bridge",
    carries: "Virtual and real parts share one experiment. Each device runs as physical, virtual, simulated or hybrid.",
    code: "prototype",
  },
];

export const VIEWS: View[] = [
  {
    id: "phase1",
    label: "Phase One",
    description:
      "The web platform on its own: documentation, learning, projects, experiments and this map. Real-time hardware, simulation and firmware are outside Phase One.",
  },
  {
    id: "now",
    label: "In the code now",
    description:
      "The code has moved past the Phase One plan. The web platform is live and the backend already prototypes simulation, serial devices and hybrid experiments. The desktop app has not started.",
  },
  {
    id: "phase2",
    label: "Phase Two",
    description:
      "The desktop application joins, bringing the simulation engine, device communication, hardware sync, real-time monitoring and offline work. This is the complete hybrid system.",
  },
];

export const DATA_FLOWS: DataFlow[] = [
  {
    id: "simulate-sensor",
    title: "Simulate a sensor",
    summary: "What happens when you run a virtual DHT11 in the Laboratory.",
    view: "now",
    steps: [
      { kind: "node", layer: "web", text: "You start a Laboratory session with a DHT11 and press Run." },
      {
        kind: "edge",
        from: "web",
        to: "comm",
        text: "The browser asks the backend to move the simulation forward 100 ms with `POST /laboratory/{id}/simulation/advance`.",
      },
      { kind: "edge", from: "comm", to: "virtual", text: "The simulation engine steps the circuit and runs the DHT11 behaviour model." },
      { kind: "edge", from: "virtual", to: "comm", text: "The sensor's new temperature and humidity are added to the simulation state." },
      { kind: "edge", from: "comm", to: "web", text: "The state comes back in the response and the Laboratory panel updates." },
    ],
  },
  {
    id: "flash-board",
    title: "Flash a real board",
    summary: "How a sketch gets from Firmware Studio onto an Arduino Uno.",
    view: "now",
    steps: [
      { kind: "node", layer: "web", text: "You write a sketch in Firmware Studio and pick the Arduino Uno." },
      {
        kind: "edge",
        from: "web",
        to: "comm",
        text: "`POST /firmware/build/jobs` queues a build, and arduino-cli compiles it for `arduino:avr:uno`.",
      },
      {
        kind: "edge",
        from: "comm",
        to: "physical",
        text: "`POST /firmware/upload` flashes the board over USB serial. With `HHIP_FIRMWARE_DRY_RUN=1` the upload is rehearsed without hardware.",
      },
      { kind: "edge", from: "physical", to: "comm", text: "The running sketch prints to serial at 115200 baud." },
      { kind: "edge", from: "comm", to: "web", text: "Firmware Studio's serial console shows the output." },
    ],
  },
  {
    id: "hybrid-run",
    title: "Run a hybrid experiment",
    summary: "One experiment that mixes a virtual part with a real board.",
    view: "now",
    steps: [
      {
        kind: "node",
        layer: "web",
        text: "On the Hybrid Hardware page you create an experiment and give each device a mode: physical, virtual or simulated.",
      },
      { kind: "edge", from: "web", to: "comm", text: "`POST /hybrid/create`, then `/hybrid/{id}/start`, sets up the session." },
      { kind: "edge", from: "comm", to: "physical", text: "The hybrid bridge connects the real board over serial." },
      {
        kind: "edge",
        from: "virtual",
        to: "physical",
        text: "The bridge runs the virtual part and the real board side by side in the same session.",
      },
      { kind: "edge", from: "physical", to: "comm", text: "Device events and state flow back to the backend." },
      { kind: "edge", from: "comm", to: "web", text: "Each `POST /hybrid/{id}/advance` returns the updated state to the page." },
    ],
  },
  {
    id: "offline-desktop",
    title: "Work offline on the desktop",
    summary: "Planned for Phase Two. Nothing here is built yet.",
    view: "phase2",
    steps: [
      { kind: "node", layer: "desktop", text: "You open a project in the desktop app with no internet connection." },
      {
        kind: "edge",
        from: "desktop",
        to: "comm",
        text: "The app reaches devices and the simulator through the communication layer on your own machine.",
      },
      { kind: "edge", from: "comm", to: "physical", text: "It talks to the board on your bench over USB." },
      { kind: "edge", from: "comm", to: "virtual", text: "Parts you don't have run as simulated stand-ins." },
      {
        kind: "edge",
        from: "desktop",
        to: "web",
        text: "When you are back online, projects and experiment records sync to the web platform.",
      },
    ],
  },
];

export const CODE_STATUS_LABELS: Record<CodeStatus, string> = {
  live: "Live",
  prototype: "Prototype",
  experimental: "Experimental",
  "not-started": "Not started",
};

export function getLayer(id: LayerId): Layer {
  const layer = LAYERS.find((item) => item.id === id);
  if (!layer) throw new Error(`Unknown layer: ${id}`);
  return layer;
}

export function getView(id: ViewId): View {
  const view = VIEWS.find((item) => item.id === id);
  if (!view) throw new Error(`Unknown view: ${id}`);
  return view;
}

export function getFlow(id: string): DataFlow | undefined {
  return DATA_FLOWS.find((flow) => flow.id === id);
}

/** Relationships touching a layer, each paired with the layer at the other end. */
export function relationshipsFor(id: LayerId): Array<{ relationship: Relationship; other: Layer }> {
  return RELATIONSHIPS.filter((item) => item.from === id || item.to === id).map((relationship) => ({
    relationship,
    other: getLayer(relationship.from === id ? relationship.to : relationship.from),
  }));
}

/** The relationship joining two layers, and whether travel runs against its from/to order. */
export function findRelationship(
  from: LayerId,
  to: LayerId,
): { relationship: Relationship; reversed: boolean } | undefined {
  for (const relationship of RELATIONSHIPS) {
    if (relationship.from === from && relationship.to === to) return { relationship, reversed: false };
    if (relationship.from === to && relationship.to === from) return { relationship, reversed: true };
  }
  return undefined;
}

function presenceFromCode(status: CodeStatus | undefined): PresenceState {
  if (status === "live") return "active";
  if (status === "prototype" || status === "experimental") return "partial";
  return "planned";
}

export function layerPresence(view: ViewId, layer: Layer): PresenceState {
  if (view === "phase1") return layer.phase === 1 ? "active" : "planned";
  if (view === "phase2") return "active";
  return presenceFromCode(layer.code.status);
}

export function relationshipPresence(view: ViewId, relationship: Relationship): PresenceState {
  if (view === "phase1") return "planned";
  if (view === "phase2") return "active";
  return presenceFromCode(relationship.code);
}

/** The short tag on each board node, which depends on the view. */
export function layerTag(view: ViewId, layer: Layer): string {
  if (view === "now") return CODE_STATUS_LABELS[layer.code.status];
  if (view === "phase1") return layer.phase === 1 ? "In scope" : "Phase Two";
  return layer.phase === 1 ? "Phase One" : "Phase Two";
}

/** Layers a step lights up, so the board can show where the data is. */
export function stepLayers(step: FlowStep): LayerId[] {
  return step.kind === "node" ? [step.layer] : [step.from, step.to];
}
