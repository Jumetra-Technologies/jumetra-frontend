/**
 * The Kiungo roadmap: the project's goals, the development phases that serve
 * them, and the milestones so far. One source for the Roadmap page, the
 * development-phases article and the tests.
 *
 * Status words are kept to four so they read the same everywhere:
 * done (shipped in a release), active (being built now), next (agreed, not
 * started), planned (direction, open to change).
 */

export type RoadmapStatus = "done" | "active" | "next" | "planned";

export const STATUS_LABEL: Record<RoadmapStatus, string> = {
  done: "Done",
  active: "In progress",
  next: "Next",
  planned: "Planned",
};

export type GoalId = "access" | "hybrid" | "learning" | "records";

/** What Kiungo is for, from the project brief. Every phase says which of these it moves forward. */
export const GOALS: Array<{ id: GoalId; title: string; text: string }> = [
  { id: "access", title: "Build without every part", text: "Students, technicians, instructors, clubs and schools can design and test a robotics project before they own all the components." },
  { id: "hybrid", title: "Mix virtual and real", text: "Virtual parts stand in for missing ones, and real boards join the same build when they arrive: fully virtual, hybrid, or fully physical." },
  { id: "learning", title: "Bridge learning and building", text: "The path from a first circuit to a working robot runs through the same tools, with guidance at each step." },
  { id: "records", title: "Work others can repeat", text: "Builds, experiments and results are recorded well enough for a classmate, instructor or club to reproduce them." },
];

export interface Milestone {
  title: string;
  status: RoadmapStatus;
  items: string[];
}

export interface Phase {
  id: string;
  name: string;
  /** One line: what the phase delivers. */
  outcome: string;
  status: RoadmapStatus;
  goals: GoalId[];
  milestones: Milestone[];
  /** The phase is finished when all of these hold. */
  exit: string[];
}

export const PHASES: Phase[] = [
  {
    id: "phase-one",
    name: "Phase One: Web platform",
    outcome: "Kiungo in the browser: learn, pick parts, build and simulate in the lab, and record the results, all without installing anything.",
    status: "active",
    goals: ["access", "learning", "records"],
    milestones: [
      {
        title: "Foundation",
        status: "done",
        items: [
          "Learning Center and Documentation",
          "Component library: 34 boards, sensors and actuators in 3D, 2D and Trace views",
          "Engineering Lab: wiring canvas, circuit check, saved sessions",
          "Projects and experiment records in the browser",
          "Google sign-in, profiles and semantic versioning",
        ],
      },
      {
        title: "Simulation you can trust",
        status: "active",
        items: [
          "Controllable sensor inputs and the default sketch's rules (v1.3)",
          "Five reference experiments with acceptance tests (QA cycles 1 and 2)",
          "Live displays, audible buzzers, USB power on Run",
          "Skeleton loading and a canvas-first lab",
        ],
      },
      {
        title: "Durable, shared work",
        status: "next",
        items: [
          "Projects, experiment records and lab sessions saved to the signed-in account, not only the browser",
          "Lab sessions linked to their project and experiment records",
          "Firmware projects run against a lab build",
        ],
      },
    ],
    exit: [
      "The five reference experiments pass their acceptance tests in the browser and in CI",
      "A signed-in user's work survives a cleared browser and opens on another device",
      "Main is deployed automatically and every release is tagged",
    ],
  },
  {
    id: "phase-two",
    name: "Phase Two: Desktop and real hardware",
    outcome: "A desktop app that talks to real boards over USB, so hybrid builds run with real and virtual parts side by side, online or off.",
    status: "planned",
    goals: ["hybrid", "access"],
    milestones: [
      {
        title: "Desktop shell",
        status: "planned",
        items: ["Installable app for Windows, macOS and Linux, with the web app's interface", "Works offline; syncs when back online"],
      },
      {
        title: "Hardware bridge",
        status: "planned",
        items: ["Detect boards on USB serial and flash firmware", "Live readings from real sensors in the lab", "Hybrid runs: real parts and virtual parts in one build, kept in sync"],
      },
    ],
    exit: ["A hybrid build with one real and one virtual part runs end to end on all three operating systems", "Offline work syncs without loss"],
  },
  {
    id: "phase-three",
    name: "Phase Three: Classrooms and clubs",
    outcome: "Tools for instructors and institutions: classes, shared kits, guided assignments and progress, so Kiungo can run a course.",
    status: "planned",
    goals: ["learning", "records", "access"],
    milestones: [
      {
        title: "Teaching",
        status: "planned",
        items: ["Classes and clubs with members and roles", "Assignments built from lab templates, with submissions", "Progress across the Learning Center for a class"],
      },
      {
        title: "Institutions",
        status: "planned",
        items: ["Shared kit inventories: which real parts a school owns", "Reusable robot subsystem templates", "Reports an instructor can grade"],
      },
    ],
    exit: ["An instructor can run a full term's lab course in Kiungo"],
  },
];

/** Key points in the project's history, newest first. The CHANGELOG has every release. */
export const HISTORY: Array<{ date: string; version: string; text: string }> = [
  { date: "2026-10-12", version: "v1.2.1–v1.8", text: "Simulation inputs, two QA cycles on the five reference experiments, skeleton loading, sound and USB power, and this roadmap in Documentation (in review, not yet on main)." },
  { date: "2026-10-09", version: "v1.2.0", text: "Accounts: sign-in modal, profiles and Google photos. Semantic versioning and the CHANGELOG start." },
  { date: "2026-10-09", version: "v1.1.0", text: "HHIP becomes Kiungo. The rename, new logo, loading animation and teal theme landed in pull request #11, merged at 09:59 EAT (06:59 UTC). Old HHIP links redirect." },
  { date: "2026-10-08", version: "v1.0.0", text: "First complete release, as HHIP: Learning Center, Documentation, Architecture explorer, Component library, Engineering Lab and Google sign-in." },
];

/** When HHIP was renamed Kiungo, for the docs and the tests. */
export const RENAME = { from: "HHIP", to: "Kiungo", version: "v1.1.0", date: "2026-10-09", pullRequest: 11 } as const;
