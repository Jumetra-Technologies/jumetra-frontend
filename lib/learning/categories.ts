import type { DocCategory, DocCategoryId, ModuleTopic } from "./types";

/** Order matches the Documentation Center workflow diagram in the Phase One spec. */
export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "system-overview",
    title: "System Overview",
    description: "What Kiungo is, how the pieces fit together, and where the platform is heading.",
    icon: "layers",
  },
  {
    id: "technical-guides",
    title: "Technical Guides",
    description: "Run Kiungo locally, connect the web app to its API, and understand device modes.",
    icon: "wrench",
  },
  {
    id: "tutorials",
    title: "Tutorials",
    description: "Hands-on learning modules, from your first LED to reading real sensors.",
    icon: "graduation-cap",
  },
  {
    id: "hardware-knowledge",
    title: "Hardware Knowledge",
    description: "Reference pages for the boards and sensors in the component library.",
    icon: "cpu",
  },
  {
    id: "developer-resources",
    title: "Developer Resources",
    description: "Frontend structure, the component asset format, and how to contribute docs.",
    icon: "code",
  },
];

const CATEGORY_BY_ID = new Map<DocCategoryId, DocCategory>(DOC_CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): DocCategory | undefined {
  return CATEGORY_BY_ID.get(id as DocCategoryId);
}

export const TOPIC_LABELS: Record<ModuleTopic, string> = {
  foundations: "Foundations",
  arduino: "Arduino",
  esp32: "ESP32",
  sensors: "Sensors",
  hybrid: "Hybrid workflow",
};

/** Display order of topics along the guided learning path. */
export const TOPIC_ORDER: ModuleTopic[] = ["foundations", "arduino", "esp32", "sensors", "hybrid"];
