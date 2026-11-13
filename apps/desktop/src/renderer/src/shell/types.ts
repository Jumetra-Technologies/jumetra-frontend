/** Everywhere the app's persistent sidebar can take you. */
export type View = "dashboard" | "projects" | "simulation" | "firmware" | "components" | "research" | "learning" | "collaboration" | "marketplace" | "assistant" | "settings";

export interface NavItem {
  view: View;
  label: string;
  /** Lucide icon name, resolved by the Sidebar; keeps this list framework-free. */
  icon: "dashboard" | "folder" | "monitor" | "cpu" | "flask" | "book" | "users" | "store" | "spark";
}

/** The platform's modules, in the order the sidebar lists them (DSK-90). Everyone sees all of them: there are no roles to unlock. */
export const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: "dashboard" },
  { view: "projects", label: "Projects", icon: "folder" },
  { view: "simulation", label: "Simulation", icon: "monitor" },
  { view: "firmware", label: "Firmware", icon: "cpu" },
  { view: "components", label: "Components", icon: "cpu" },
  { view: "research", label: "Research", icon: "flask" },
  { view: "learning", label: "Learning", icon: "book" },
  { view: "collaboration", label: "Collaboration", icon: "users" },
  { view: "marketplace", label: "Marketplace", icon: "store" },
  { view: "assistant", label: "AI Assistant", icon: "spark" },
];
