/** Documentation pages that are interactive pages rather than articles. Linked from the Documentation home, searchable. */
export const DOC_PAGES = [
  {
    href: "/docs/architecture",
    title: "System architecture",
    summary: "The five layers of Kiungo, from the web app to the boards on your bench. Select a layer or follow data from end to end.",
    tags: ["architecture", "layers", "system", "desktop", "communication", "hardware"],
  },
  {
    href: "/docs/roadmap",
    title: "Roadmap and development phases",
    summary: "The project's goals, the three development phases, what is done and next, and how HHIP became Kiungo.",
    tags: ["roadmap", "phases", "goals", "milestones", "history", "hhip", "rename"],
  },
] as const;
