/**
 * Copy for the home page, kept as data so it can be reviewed in one place.
 *
 * Counts come from the code (component library, learning modules, docs) so
 * the page never claims more than the product has.
 */
import { HARDWARE_ASSETS } from "@/lib/hardware/asset-data";
import { ARTICLES, MODULES } from "@/lib/learning";

const assets = Object.values(HARDWARE_ASSETS);
const boards = assets.filter((asset) => ["arduino", "esp32", "pico", "stm32"].includes(asset.metadata.category));

export const COUNTS = {
  parts: assets.length,
  boards: boards.length,
  modules: MODULES.length,
  articles: ARTICLES.length,
  sensors: assets.filter((asset) => asset.metadata.category === "sensors").length,
};

/** Search-engine metadata. Title under 60 characters, description under 160. */
export const SEO = {
  title: "Arduino & ESP32 Robotics Simulator for Students | HHIP",
  description:
    "Simulate robots in your browser with virtual Arduino, ESP32 and sensor parts, then plug in real hardware when you have it. Free for students, schools and clubs.",
  siteName: "HHIP",
  keywords: [
    "Arduino simulator",
    "ESP32 simulator",
    "online circuit simulator",
    "robotics simulator for students",
    "simulate sensors",
    "hybrid hardware",
    "virtual robotics lab",
  ],
};

export const HERO = {
  headline: "You don't need every component to build a robot.",
  /** The headline's line breaks on wide screens, set by hand so no line is left with one word. */
  headlineLines: ["You don't need", "every component", "to build a robot."],
  lead:
    "The sensor is on back order. The board is in the school cupboard. The servo costs more than the project. Start anyway: HHIP gives you working virtual parts today and lets real ones join when they arrive.",
  primary: { label: "Build a robot now", href: "/laboratory/workspace" },
  secondary: { label: "Take the learning path", href: "/learn" },
  facts: "Virtual Arduino Uno, ESP32, Raspberry Pi Pico and STM32 boards. Free for students, clubs and schools.",
  boardHint: "Drag to turn the board. Click the LED to run Blink.",
};

/** Headings carry their own line breaks (\n) so no line is left holding one word. */
export const SIMULATE = {
  heading: "HHIP simulates all the\ncomponents you need.\nAnd more.",
  body: `Boards, sensors, motors, displays and the wires between them behave the way the real parts do: a DHT11 reports temperature and humidity, an HC-SR04 measures distance, a servo turns to the angle you ask for. Wire them on an infinite canvas, run the simulation, watch the readings, and fix mistakes before they cost you a part.`,
  previewNote: "A preview. In the Engineering Lab these run as simulated parts and the readings come from the simulation engine.",
  cta: { label: "Build a robot now", href: "/laboratory/workspace" },
};

export const LEARN = {
  heading: "Don't know where to start?\nTake a learning path.",
  body: `${COUNTS.modules} short modules take you from what a circuit is to reading real sensors and mixing virtual and physical parts. Each one has objectives, a wiring table, working code and a reference page. No hardware is needed for the first half.`,
  cta: { label: "Start the learning path", href: "/learn" },
};

export const LIBRARY = {
  heading: "Browse a real component library.",
  body: `${COUNTS.parts} parts with pinouts, voltages, interfaces and the mistakes that break them, from four microcontroller boards to the humble jumper wire. The same parts you drop onto the canvas, documented like a datasheet you can actually read.`,
  cta: { label: "Open the component library", href: "/components" },
};

export const HYBRID = {
  heading: "Already have a board?\nPlug it in.",
  body: `Most simulators stop where real hardware begins. HHIP doesn't. Plug an Arduino or ESP32 into your computer and it joins the same experiment as your simulated parts. Switch any device between virtual, simulated and physical without rebuilding, so you move to real hardware one part at a time.`,
  cta: { label: "See how hybrid works", href: "/docs/technical-guides/device-modes" },
};

export const SIGN_UP = {
  heading: "Save your work.\nPick up anywhere.",
  body: "Sign in with Google so HHIP knows it's you. Your workspace session follows you between devices, and you're first in line as accounts grow into shared projects and classrooms.",
  signedInBody: "You're signed in. Your projects and experiment records are waiting.",
  fineprint: "Free. No card. We keep your name and email so your work stays yours.",
  cta: { label: "Open your projects", href: "/workspace" },
};

export const FOOTER = {
  about:
    "HHIP, the Universal Hybrid Hardware Simulation System, is a web platform for learning, simulating and building robotics and IoT projects. Students, technicians, instructors, clubs and schools use it to design circuits, test them with virtual Arduino, ESP32 and sensor components, document experiments and, when the real parts are on the bench, run physical and simulated hardware together. HHIP is built by Jumetra Technologies and is in its first phase: a web proof of concept ahead of a desktop application for offline work and direct device control.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "Engineering Lab", href: "/laboratory/workspace" },
        { label: "Component library", href: "/components" },
        { label: "Projects", href: "/workspace" },
        { label: "Experiment records", href: "/experiments" },
        { label: "Firmware", href: "/firmware" },
        { label: "Hybrid hardware", href: "/hybrid" },
      ],
    },
    {
      title: "Learn",
      links: [
        { label: "Learning Center", href: "/learn" },
        { label: "Documentation", href: "/docs" },
        { label: "Hardware reference", href: "/docs/hardware-knowledge" },
        { label: "Run HHIP locally", href: "/docs/technical-guides/run-locally" },
        { label: "FAQ", href: "/learn#faq" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "/legal/terms" },
        { label: "User Agreement", href: "/legal/user-agreement" },
        { label: "Acceptable Use Policy", href: "/legal/acceptable-use" },
        { label: "Privacy Policy", href: "/legal/privacy" },
        { label: "Cookie Policy", href: "/legal/cookies" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "What is HHIP", href: "/docs/system-overview/what-is-hhip" },
        { label: "Architecture", href: "/architecture" },
        { label: "Roadmap", href: "/roadmap" },
        { label: "Development phases", href: "/docs/system-overview/development-phases" },
        { label: "GitHub", href: "https://github.com/Jumetra-Technologies" },
      ],
    },
  ],
  trademarks:
    "Arduino is a trademark of Arduino SA. ESP32 is a trademark of Espressif Systems. Raspberry Pi is a trademark of Raspberry Pi Ltd. STM32 is a trademark of STMicroelectronics. HHIP is not affiliated with or endorsed by any of them.",
  copyright: `© ${new Date().getFullYear()} Jumetra Technologies. HHIP is a Phase One proof of concept.`,
};

/** Structured data for search engines (schema.org SoftwareApplication). */
export function structuredData(origin?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HHIP",
    alternateName: "Universal Hybrid Hardware Simulation System",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web browser",
    ...(origin ? { url: origin } : {}),
    description: SEO.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: "Jumetra Technologies", url: "https://github.com/Jumetra-Technologies" },
    featureList: [
      "Virtual Arduino Uno, ESP32, Raspberry Pi Pico and STM32 boards",
      `${COUNTS.parts}-part component library with pinouts and specifications`,
      "Sensor, actuator and display simulation",
      "Hybrid experiments mixing physical and simulated hardware",
      `${COUNTS.modules}-module learning path`,
      "Experiment records and Markdown reports",
    ],
  };
}
