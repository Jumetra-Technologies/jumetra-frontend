import {
  BarChart3,
  Beaker,
  Boxes,
  Cpu,
  FileText,
  FlaskConical,
  Home,
  LayoutDashboard,
  ShoppingBag,
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
      { href: "/laboratory/workspace", label: "Laboratory", icon: Beaker, primary: true },
      { href: "/firmware", label: "Firmware", icon: Cpu },
    ],
  },
  {
    id: "research",
    label: "Research",
    items: [
      { href: "/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
      { href: "/hybrid", label: "Hybrid Bridge", icon: Workflow },
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
    "/firmware",
    "/experiments",
    "/marketplace",
    "/analytics",
  ].includes(item.href),
);

export function isNavItemActive(activePath: string, href: string): boolean {
  if (href === "/") return activePath === "/";
  return activePath === href || activePath.startsWith(`${href}/`);
}
