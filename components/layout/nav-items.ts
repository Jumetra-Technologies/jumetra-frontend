import {
  BookOpen,
  BarChart3,
  Beaker,
  Boxes,
  CircuitBoard,
  Cpu,
  FileText,
  FlaskConical,
  GraduationCap,
  Home,
  LayoutDashboard,
  Map,
  Network,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Grouped primary navigation for the app shell sidebar. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/workspace", label: "Projects", icon: Boxes },
      { href: "/laboratory/workspace", label: "Engineering Lab", icon: Beaker, primary: true },
      { href: "/components", label: "Component library", icon: CircuitBoard },
      { href: "/firmware", label: "Firmware", icon: Cpu },
    ],
  },
  {
    id: "test",
    label: "Test and report",
    items: [
      { href: "/experiments", label: "Experiment Records", icon: FlaskConical },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/dashboard", label: "System Diagnostics", icon: LayoutDashboard },
      { href: "/analytics", label: "Advanced Analytics", icon: BarChart3 },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    items: [
      { href: "/learn", label: "Learning Center", icon: GraduationCap },
      { href: "/docs", label: "Documentation", icon: BookOpen },
      { href: "/architecture", label: "Architecture", icon: Network },
      { href: "/roadmap", label: "Roadmap", icon: Map },
      { href: "/hybrid", label: "Hybrid Hardware", icon: Workflow },
    ],
  },
];

/** Flat list kept for callers that need a single array. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** Compact header links for the engineering workspace. */
export const WORKSPACE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  [
    "/",
    "/workspace",
    "/laboratory/workspace",
    "/components",
    "/firmware",
    "/experiments",
  ].includes(item.href),
);

export function isNavItemActive(activePath: string, href: string): boolean {
  if (href === "/") return activePath === "/";
  return activePath === href || activePath.startsWith(`${href}/`);
}
