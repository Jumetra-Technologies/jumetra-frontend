import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureExplorer } from "@/components/architecture/ArchitectureExplorer";
import { DashboardShell } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "System architecture",
  description:
    "How the Kiungo web platform, the future desktop app, the communication layer and virtual and physical hardware connect, from Phase One to Phase Two.",
};

const FURTHER_READING = [
  { href: "/docs/system-overview/how-kiungo-works", label: "How Kiungo works" },
  { href: "/docs/technical-guides/device-modes", label: "Device modes" },
  { href: "/docs/system-overview/development-phases", label: "Development phases" },
  { href: "/roadmap", label: "Roadmap" },
];

export default function ArchitecturePage() {
  return (
    <DashboardShell activePath="/architecture">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">How Kiungo fits together</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Five layers make up the system, from the web app you are using to the boards on your bench. Select a layer to see what it does
          and what it connects to, or follow a piece of data from one end to the other.
        </p>
      </div>

      <ArchitectureExplorer />

      <nav aria-label="Further reading" className="mt-10 border-t border-border pt-5">
        <p className="text-sm font-semibold">Further reading</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {FURTHER_READING.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-primary underline-offset-4 hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </DashboardShell>
  );
}
