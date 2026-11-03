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
  title: "Arduino & ESP32 Robotics Simulator for Students | Kiungo",
  description:
    "Simulate robots in your browser with virtual Arduino, ESP32 and sensor parts, then plug in real hardware when you have it. Free for students, schools and clubs.",
  siteName: "Kiungo",
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
    "The sensor is on back order. The board is in the school cupboard. The servo costs more than the project. Start anyway: Kiungo gives you working virtual parts today and lets real ones join when they arrive.",
  primary: { label: "Build a robot now", href: "/laboratory/workspace" },
  secondary: { label: "Take the learning path", href: "/learn" },
  /** Shown instead of the learning path to people who aren't signed in: opens Log in (Continue with Google). */
  login: { label: "Log in" },
  facts: "Virtual Arduino Uno, ESP32, Raspberry Pi Pico and STM32 boards in your browser, and an app for your computer. Free for students, clubs and schools.",
  boardHint: "An Arduino Uno R3, drawn to scale. Drag to turn it, or run Blink.",
};

/** Headings carry their own line breaks (\n) so no line is left holding one word. */
export const SIMULATE = {
  heading: "Kiungo simulates all the\ncomponents you need.\nAnd more.",
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
  body: `Most simulators stop where real hardware begins. Kiungo doesn't. In the desktop app, plug in an Arduino Uno and mark it Physical: your own code runs on it while the lab plays the parts you don't have yet, and the lab shows what the board drives. Switch any part between virtual and physical without rebuilding, so you move to real hardware one part at a time.`,
  cta: { label: "Get the desktop app", href: "/#desktop" },
  secondary: { label: "See how hybrid works", href: "/docs/technical-guides/device-modes" },
};

const BLUR_CODE = "data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAACwBACdASogABQAPrVUo00nJKMiKAgA4BaJZQB4VjKLDhRkv/QrJBbjG+mDVPoAAP735sJo2Do+4wHIE1ABFNKgiwKRBTMvTRKVda8XYm4N41EvfMrPFV/0tJRnefffJcETqzhZckJ7YV+M/zEDYadd6ErYXMUtREJbmIx2/CJsqi7/omdUzXlBO+ZJXu1YvQ//qgNL7eS3B/EeB+YN7gAA";
const BLUR_BOARD = "data:image/webp;base64,UklGRrIAAABXRUJQVlA4IKYAAAAwBQCdASogABQAPrVQokwnJKMiKAqo4BaJYwAAKcdgdiPx0Tr7M4fIaOdIYbynssDNgAD+8hC7xgXNdKEKu+GeA8ElYk0IL8WyC0n7m7/TLWc5+l32NpAGeY8QL146j14uZ+rloDwt51O1tRuvKVQpaXYq5oGrfEv6epsEIYxfaUqDC33inwBv/t/ouBC7HfvDh60f/+ZypJgvEhjBNjn1wi2mAAAA";
const BLUR_WORLD = "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAACQBACdASogABQAPrVQoEwnJKMiKAqo4BaJZwDMWBEZmq1pV5bqFGx0fyj1VdgA/vfmsBNStIQAGc8BU+f6k+Mk+skPiLRLnH69H3SDsV1WdpKg8EGWGoHfTKzz92cSvzkAEqvFI9ABCtPDc5hvWePtTiaO/QvBeZzrWwLw1IWcAAAA";
const BLUR_FIX = "data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAADQBACdASogABQAPrVSo00nJKMiKAgA4BaJZQDKtdwLhFO/i46fTDqwagqPgB//AAD+9zsqf0ym7hmxOW+ilOkZBLpkCrKQJX/umnA7gakzIZR4ey6uWtE4dqMq8m7zWUZ5C4fHylXVyDCgKVx73dr9rrU0rnI/DMh0g51ilZlqYUm94bawsGN7jGHm3KBFj47AFOUOYAAAAA==";

/** One moment in the desktop app, as a screenshot with the words for it. The images are 2560 × 1640 (a 1280 × 820 window at 2×). */
export interface DesktopMoment {
  id: string;
  /** The tab's label: two or three words. */
  label: string;
  /** What the screenshot shows, in one sentence; also the image's alt text. */
  caption: string;
  src: string;
  /** A 32-pixel-wide version, shown while the real one loads. */
  blur: string;
}

/**
 * The desktop app's release, at the end of the home page (sprint 11). The
 * screenshots are the app as it is: `apps/desktop`, taken at 1280 × 820.
 */
export const DESKTOP = {
  heading: "Then take it\nto your desk.",
  lead: `Kiungo for Windows, macOS and Linux runs your own code: on an emulated board, on a real one, or both at once. Projects are folders on your computer, and once you've signed in nothing needs the internet.`,
  moments: [
    {
      id: "code",
      label: "Code and run",
      caption: "Write the sketch beside the circuit. Run builds it on your computer and runs it on an emulated Uno at real speed, with the serial output and every pin live.",
      src: "/desktop/code-run.webp",
      blur: BLUR_CODE,
    },
    {
      id: "board",
      label: "Real board",
      caption: "Mark the board Physical and Run uploads your code to the real Uno. The lab plays the parts you don't have, and Emergency stop is one key away.",
      src: "/desktop/real-board.webp",
      blur: BLUR_BOARD,
    },
    {
      id: "world",
      label: "Robot world",
      caption: "Two motors make a robot. It drives round a course with real physics, and you can move the boxes while it runs.",
      src: "/desktop/robot-world.webp",
      blur: BLUR_WORLD,
    },
    {
      id: "fix",
      label: "Fix mistakes",
      caption: "Compiler errors come back in plain words, on the right line, with a fix you can look at before it's made.",
      src: "/desktop/fix-mistakes.webp",
      blur: BLUR_FIX,
    },
  ] as const satisfies readonly DesktopMoment[],
  download: {
    /** The main button, with the visitor's system filled in. */
    label: (platform: string) => `Download for ${platform}`,
    /** Before the visitor's system is known, and on phones and tablets. */
    generic: "Download for your computer",
    all: "All downloads",
    /** Shown while no release has been published yet. */
    none: "The first beta build is being prepared. Until it's here, everything on the website works in your browser.",
    noneCta: { label: "Open the lab in your browser", href: "/laboratory/workspace" },
    phones: "Kiungo runs on Windows, macOS and Linux computers. Open this page on one of them to download it.",
    beta: "Beta: the installers aren't signed yet, so Windows and macOS warn before the first launch.",
    howToOpen: "How to open the beta",
    steps: [
      ["Windows", "SmartScreen says the publisher is unknown. Choose More info, then Run anyway."],
      ["macOS", "The first time, right-click the app and choose Open, then Open again."],
      ["Linux", "Make the AppImage executable (right-click, Properties, or chmod +x), or install the .deb or .rpm."],
    ],
    needsTitle: "What your computer needs",
    needs: [
      "Windows 10 or 11, macOS 12 or later, or 64-bit Linux (Ubuntu 22.04, Fedora 39 or similar).",
      "4 GB of memory and about 1 GB of disk space, plus room for your projects.",
      "Internet the first time you sign in and the first time you build for a board. After that it works offline.",
      "For real boards: a USB port and a data cable. Some clone boards need a driver; the app tells you when.",
    ],
  },
};

export const FOOTER = {
  about:
    "Kiungo (formerly HHIP) is a web platform for learning, simulating and building robotics and IoT projects. Students, technicians, instructors, clubs and schools use it to design circuits, test them with virtual Arduino, ESP32 and sensor components, document experiments and, when the real parts are on the bench, run physical and simulated hardware together. Kiungo is built by Kiungo Labs Technologies. Its second phase adds a desktop application for Windows, macOS and Linux that runs your own code, works offline and talks to real boards directly.",
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
        { label: "Desktop app", href: "/#desktop" },
      ],
    },
    {
      title: "Learn",
      links: [
        { label: "Learning Center", href: "/learn" },
        { label: "Documentation", href: "/docs" },
        { label: "Hardware reference", href: "/docs/hardware-knowledge" },
        { label: "Run Kiungo locally", href: "/docs/technical-guides/run-locally" },
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
        { label: "What is Kiungo", href: "/docs/system-overview/what-is-kiungo" },
        { label: "Architecture", href: "/docs/architecture" },
        { label: "Roadmap", href: "/docs/roadmap" },
        { label: "Development phases", href: "/docs/system-overview/development-phases" },
        { label: "GitHub", href: "https://github.com/Jumetra-Technologies" },
      ],
    },
  ],
  trademarks:
    "Arduino is a trademark of Arduino SA. ESP32 is a trademark of Espressif Systems. Raspberry Pi is a trademark of Raspberry Pi Ltd. STM32 is a trademark of STMicroelectronics. Kiungo is not affiliated with or endorsed by any of them.",
  copyright: `© ${new Date().getFullYear()} Kiungo Labs Technologies.`,
};

/** Structured data for search engines (schema.org SoftwareApplication). With a release, the download and its version too. */
export function structuredData(origin?: string, release?: { version: string; files: Array<{ platform: string; url: string }> } | null) {
  const windows = release?.files.find((f) => f.platform === "windows") ?? release?.files[0];
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kiungo",
    ...(release ? { softwareVersion: release.version } : {}),
    ...(windows ? { downloadUrl: windows.url } : {}),
    alternateName: ["HHIP", "Universal Hybrid Hardware Simulation System"],
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web browser, Windows, macOS, Linux",
    ...(origin ? { url: origin } : {}),
    description: SEO.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: "Kiungo Labs Technologies", url: "https://github.com/Jumetra-Technologies" },
    featureList: [
      "Virtual Arduino Uno, ESP32, Raspberry Pi Pico and STM32 boards",
      `${COUNTS.parts}-part component library with pinouts and specifications`,
      "Sensor, actuator and display simulation",
      "Hybrid experiments mixing physical and simulated hardware",
      "Desktop app that runs your own Arduino code on an emulated or real board",
      `${COUNTS.modules}-module learning path`,
      "Experiment records and Markdown reports",
    ],
  };
}
