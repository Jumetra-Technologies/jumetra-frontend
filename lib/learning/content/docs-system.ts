import type { DocArticle } from "../types";

export const SYSTEM_OVERVIEW_ARTICLES: DocArticle[] = [
  {
    slug: "what-is-hhip",
    category: "system-overview",
    title: "What is HHIP?",
    summary:
      "HHIP lets students, technicians, instructors, and clubs design, simulate, and document robotics and IoT projects with or without every physical part.",
    tags: ["introduction", "vision", "hybrid", "robotics", "iot"],
    related: ["system-overview/how-hhip-works", "technical-guides/device-modes"],
    blocks: [
      {
        type: "p",
        text: "The Universal Hybrid Hardware Simulation System (HHIP) is a platform for building hardware projects when you do not have every component in front of you. You can design a system, test its behavior in simulation, connect real devices when they are available, and keep a record of what you tried.",
      },
      { type: "h2", text: "The problem HHIP addresses" },
      {
        type: "p",
        text: "Hardware work is usually split across disconnected tools: one for choosing parts, another for simulation, another for programming, a physical bench for the real build, and notes kept somewhere else entirely. Moving from a simulation result to real hardware is rarely smooth, and experiments are often too poorly documented for someone else to reproduce.",
      },
      {
        type: "p",
        text: "Learners feel this most. Understanding a single sensor reading means knowing electronics, embedded programming, communication protocols, and debugging at the same time.",
      },
      { type: "h2", text: "What HHIP gives you" },
      {
        type: "ul",
        items: [
          "A **component library** describing boards, sensors, and actuators, including pins, voltages, and interfaces.",
          "An **engineering laboratory** where components are placed, wired, and run, in virtual, physical, or hybrid mode.",
          "A **project workspace and experiment journal** that keep objectives, hardware, procedures, observations, and results together.",
          "**Documentation and learning material** so a new contributor can understand the platform without direct help.",
        ],
      },
      { type: "h2", text: "Who it is for" },
      {
        type: "p",
        text: "Students, technicians, instructors, clubs, and schools: anyone who needs to practise or prototype robotics without being limited by which parts they happen to own.",
      },
      {
        type: "callout",
        tone: "tip",
        title: "New here?",
        text: "Start with the [Learning Center](/learn) and the first module, Getting started with HHIP.",
      },
    ],
  },
  {
    slug: "how-hhip-works",
    category: "system-overview",
    title: "How HHIP works",
    summary:
      "The end-to-end workflow, from defining a project to recording results, and which part of the app handles each step.",
    tags: ["workflow", "architecture", "projects", "laboratory", "experiments", "layers"],
    related: ["system-overview/development-phases", "technical-guides/api-and-environment"],
    blocks: [
      {
        type: "p",
        text: "A typical HHIP project moves through four steps. Each step has a home in the app.",
      },
      {
        type: "table",
        caption: "Project workflow and where each step lives",
        head: ["Step", "What you do", "Where"],
        rows: [
          ["1. Define", "Capture the purpose, objectives, contributors, and category of the project.", "[Projects](/workspace)"],
          ["2. Select hardware", "Check specifications, pins, interfaces, and controller compatibility.", "[Component library](/components)"],
          ["3. Assemble and test", "Place components, wire pins, and run the system virtually, physically, or both.", "[Engineering Lab](/laboratory/workspace)"],
          ["4. Record", "Save procedure, observations, results, and notes; export Markdown reports.", "[Experiment Records](/experiments) and [Reports](/reports)"],
        ],
      },
      { type: "h2", text: "The layers underneath" },
      {
        type: "p",
        text: "HHIP is built in layers so that each concern can grow independently.",
      },
      {
        type: "ol",
        items: [
          "**Web application.** The interface you use: projects, library, laboratory, and documentation.",
          "**Service boundary.** The web app talks to a backend API over JSON/HTTP, and over WebSockets for live updates.",
          "**Hardware and simulation services.** The backend holds the component catalog, the simulation engine, firmware tooling, and the hybrid device bridge.",
          "**Physical devices.** Real boards connected through the backend, for example over a serial port.",
        ],
      },
      {
        type: "callout",
        tone: "note",
        title: "Where your data lives today",
        text: "Projects, experiment records, and reports are stored in your browser's local storage. They are not yet synchronized to the backend or shared between people. Clearing site data removes them.",
      },
      {
        type: "link-card",
        href: "/architecture",
        title: "Architecture explorer",
        text: "Select a layer to see what it connects to, or follow data from the browser to a real board.",
      },
    ],
  },
  {
    slug: "development-phases",
    category: "system-overview",
    title: "Development phases",
    summary:
      "What Phase One (the web platform) covers, what is deliberately left for Phase Two (the desktop application), and what is already prototyped.",
    tags: ["roadmap", "phase one", "phase two", "desktop", "scope", "poc"],
    related: ["system-overview/how-hhip-works"],
    blocks: [
      {
        type: "p",
        text: "HHIP is being built in phases. The first phase establishes the knowledge and organization layer; later phases add the heavy hardware capabilities.",
      },
      { type: "h2", text: "Phase One: web platform (proof of concept)" },
      {
        type: "p",
        text: "Phase One is a web-based proof of concept. It introduces the HHIP ecosystem, demonstrates the intended workflow, and lays the foundation for the desktop application.",
      },
      {
        type: "ul",
        items: [
          "Documentation and learning resources",
          "Project management",
          "Hardware information management (the virtual hardware library)",
          "System architecture visualization",
          "Experiment documentation",
          "Roadmap communication",
        ],
      },
      { type: "h3", text: "Out of scope for Phase One" },
      {
        type: "ul",
        items: [
          "Real-time hardware communication and physical device control",
          "Hardware synchronization",
          "Simulation engine execution",
          "Firmware deployment and hardware debugging",
          "Device drivers and offline hardware management",
        ],
      },
      { type: "h2", text: "Phase Two: desktop application" },
      {
        type: "p",
        text: "The desktop application turns HHIP from a documentation and organization platform into an operational hybrid hardware environment.",
      },
      {
        type: "ul",
        items: [
          "Simulation engine",
          "Physical device communication",
          "Hardware synchronization",
          "Device management",
          "Real-time monitoring",
          "Offline development",
        ],
      },
      {
        type: "callout",
        tone: "note",
        title: "Some later-phase work is already prototyped",
        text: "The current web app already includes early versions of the engineering laboratory, hybrid device bridge, firmware studio, and simulation controls, backed by the API. Treat these as prototypes: the limits are listed in [Device modes](/docs/technical-guides/device-modes).",
      },
      {
        type: "link-card",
        href: "/roadmap",
        title: "Product roadmap",
        text: "See what is available now and what is planned next.",
      },
    ],
  },
];

export const TECHNICAL_GUIDE_ARTICLES: DocArticle[] = [
  {
    slug: "run-locally",
    category: "technical-guides",
    title: "Run HHIP locally",
    summary:
      "Start the backend API and the web frontend on your own machine with two terminals.",
    tags: ["setup", "install", "localhost", "npm", "python", "uvicorn", "development"],
    related: ["technical-guides/api-and-environment", "developer-resources/frontend-structure"],
    blocks: [
      {
        type: "p",
        text: "HHIP is two repositories: a Next.js frontend and a FastAPI backend. Run both for the full experience. Tested with Python 3.13 and Node.js 22.",
      },
      { type: "h2", text: "1. Start the backend" },
      {
        type: "code",
        language: "bash",
        filename: "Jumetra-Backend",
        code: `python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python -m api.seed               # optional: sample experiments
python run_api.py                # http://127.0.0.1:8000`,
      },
      {
        type: "p",
        text: "Check that it is running by opening `http://127.0.0.1:8000/health` (it should return `{\"status\":\"ok\"}`) or the interactive API docs at `/docs` on the same host.",
      },
      { type: "h2", text: "2. Start the frontend" },
      {
        type: "p",
        text: "Create a file named `.env.local` in the frontend repository:",
      },
      {
        type: "code",
        language: "bash",
        filename: ".env.local",
        code: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000`,
      },
      {
        type: "code",
        language: "bash",
        filename: "jumetra-frontend",
        code: `npm ci
npm run dev                      # http://localhost:3000`,
      },
      {
        type: "callout",
        tone: "warning",
        title: "Do not copy .env.local.example unchanged",
        text: "The example file points at the production backend. Using it as-is would send your local work to production. Use the localhost values above.",
      },
      {
        type: "callout",
        tone: "tip",
        title: "Restart after changing environment values",
        text: "`NEXT_PUBLIC_*` values are embedded when Next.js builds, so restart `npm run dev` after editing `.env.local`.",
      },
      { type: "h2", text: "Troubleshooting" },
      {
        type: "table",
        head: ["Symptom", "Likely cause and fix"],
        rows: [
          [
            "\"Cannot reach the Jumetra API\"",
            "The backend is not running, or `NEXT_PUBLIC_API_URL` points somewhere else. Start the backend and restart the frontend.",
          ],
          [
            "`No module named 'api'`",
            "Run `python run_api.py` from the backend repository root, or use `uvicorn api.main:app --reload --port 8000` from there.",
          ],
          [
            "Browser CORS errors",
            "Local origins on `localhost` and `127.0.0.1` are allowed by default. For any other origin, set `HHIP_CORS_ORIGINS` on the backend.",
          ],
          [
            "Port already in use",
            "Another process holds 8000 or 3000. Stop it, or pass a different port (`--port` for Next.js, the `PORT` variable for `run_api.py`) and update the environment values.",
          ],
          [
            "Fonts fail to load",
            "The app fetches Google Fonts at build and dev time, so an internet connection is needed.",
          ],
        ],
      },
    ],
  },
  {
    slug: "api-and-environment",
    category: "technical-guides",
    title: "API and environment",
    summary:
      "Environment variables for both repositories and the main families of backend endpoints the frontend uses.",
    tags: ["api", "environment", "env", "cors", "websocket", "endpoints", "auth", "deployment"],
    related: ["technical-guides/run-locally", "developer-resources/frontend-structure"],
    blocks: [
      {
        type: "p",
        text: "The frontend is a client of the backend API. This page lists the configuration each side reads and the groups of endpoints in play.",
      },
      { type: "h2", text: "Frontend variables" },
      {
        type: "table",
        head: ["Variable", "Purpose"],
        rows: [
          [
            "`NEXT_PUBLIC_API_URL`",
            "Base URL of the backend. Defaults to `http://127.0.0.1:8000` in development and the hosted backend in production builds.",
          ],
          ["`NEXT_PUBLIC_WS_URL`", "Base URL for WebSocket connections, such as `ws://127.0.0.1:8000`."],
          ["`NEXT_PUBLIC_GOOGLE_CLIENT_ID`", "Needed only if you want Google sign-in to work."],
        ],
      },
      { type: "h2", text: "Backend variables" },
      {
        type: "table",
        head: ["Variable", "Purpose"],
        rows: [
          ["`HHIP_CORS_ORIGINS`", "Comma-separated browser origins allowed to call the API. Required for any deployed frontend."],
          ["`HHIP_DATA_DIR`", "Where the SQLite database and application data are stored. Defaults to a `data` folder in the repository."],
          ["`HHIP_FIRMWARE_DRY_RUN`", "Set to `1` or `true` to simulate firmware builds and uploads without touching hardware."],
          ["`JWT_SECRET_KEY`", "Signing key for sign-in tokens."],
          ["`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`", "Google sign-in configuration."],
          ["`HOST`, `PORT`, `UVICORN_RELOAD`", "Used by `run_api.py`. Set `UVICORN_RELOAD=1` for auto-reload while developing the backend."],
        ],
      },
      {
        type: "callout",
        tone: "note",
        title: "Sign-in is optional for local work",
        text: "In the current build the data endpoints are not gated behind sign-in, so you can develop and explore without configuring Google credentials.",
      },
      { type: "h2", text: "Endpoint families" },
      {
        type: "table",
        head: ["Path prefix", "What it provides"],
        rows: [
          ["`/components`, `/components/v2`", "Hardware catalog search, component details, packages, and SVG renderers."],
          ["`/controllers`", "Supported microcontrollers and compatibility."],
          ["`/laboratory`", "Virtual laboratory sessions and simulation control."],
          ["`/engineering/workspace`", "The engineering workspace canvas: nodes, wires, run, pause, step, undo, and redo."],
          ["`/hybrid`", "Hybrid experiments, physical devices, pins, and connections."],
          ["`/firmware`", "Firmware projects, templates, toolchains, builds, uploads, and serial."],
          ["`/experiments`, `/analytics`", "Research experiments and analytics."],
          ["`/discovery`, `/devices`", "Hardware discovery and device information."],
          ["`/auth`", "Google sign-in and the current user."],
        ],
      },
      {
        type: "p",
        text: "Live updates arrive over WebSockets, for example the platform event stream and per-workspace streams. The interactive reference for every endpoint is served by the backend itself at `/docs`.",
      },
    ],
  },
  {
    slug: "device-modes",
    category: "technical-guides",
    title: "Device modes and simulation limits",
    summary:
      "What physical, virtual, simulator, and hybrid devices mean in HHIP, and what the current simulation does not do.",
    tags: ["hybrid", "physical", "virtual", "simulator", "modes", "limitations", "simulation", "wokwi"],
    related: ["system-overview/development-phases", "hardware-knowledge/esp32-devkit"],
    blocks: [
      {
        type: "p",
        text: "Every component in the engineering laboratory runs in one of four modes. Mixing modes in a single system is what makes HHIP a hybrid platform. New components start as virtual, and you change a component's mode by selecting it and using the mode dropdown in the Inspector.",
      },
      {
        type: "table",
        head: ["Mode", "Meaning"],
        rows: [
          ["Physical", "A real device attached through the backend, for example a board on a serial port."],
          ["Virtual", "A software model of the component that produces readings and responds to commands."],
          ["Simulator", "An external simulator plugged in through an adapter. Wokwi and Proteus adapters are planned."],
          ["Hybrid", "A system that combines physical and virtual parts, such as a real ESP32 and DHT11 with a virtual soil moisture sensor and relay."],
        ],
      },
      { type: "h2", text: "What the simulation does not do" },
      {
        type: "p",
        text: "Simulation is a tool for exercising logic and wiring, not a guarantee of how a real circuit behaves. In the current prototype:",
      },
      {
        type: "ul",
        items: [
          "Virtual components use deterministic math models, not physics-accurate, SPICE-level simulation.",
          "Firmware is not executed on virtual microcontrollers: each board runs a built-in \"blink and read\" sketch that switches its outputs and reads its sensors.",
          "Circuit checks work pin by pin on the nets the wires make (supply, ground, voltage levels, pin capabilities, bus wiring), but they do not calculate currents or model resistors.",
          "WiFi and MQTT adapters are stubs, and external simulator adapters are not integrated yet.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Always verify on real hardware",
        text: "A passing simulation is not proof of electrical safety, mechanical performance, or real-world reliability. Check voltages, current limits, and power supplies against the datasheet before connecting real parts.",
      },
    ],
  },
];
