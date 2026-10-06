import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";

export default function MarketplacePage() {
  return (
    <DashboardShell activePath="/marketplace">
      <h2 className="text-2xl font-bold">Component Marketplace</h2>
      <p className="mt-2 text-muted">
        Browse and install hardware models, simulator adapters, and firmware plugins.
        Full marketplace commerce ships in a later sprint.
      </p>
      <Link href="/laboratory/workspace" className="mt-6 inline-block text-primary underline">
        Open Laboratory Workspace →
      </Link>
    </DashboardShell>
  );
}
