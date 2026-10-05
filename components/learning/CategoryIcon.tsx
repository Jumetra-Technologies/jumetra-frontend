import { Code2, Cpu, GraduationCap, Layers, Wrench, type LucideIcon } from "lucide-react";
import type { DocCategory } from "@/lib/learning/types";

const ICONS: Record<DocCategory["icon"], LucideIcon> = {
  layers: Layers,
  wrench: Wrench,
  "graduation-cap": GraduationCap,
  cpu: Cpu,
  code: Code2,
};

export function CategoryIcon({ icon, className }: { icon: DocCategory["icon"]; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
