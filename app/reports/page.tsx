import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";

export default function ReportsPage() {
  return (
    <DashboardShell activePath="/reports">
      <h2 className="text-2xl font-bold">Reports</h2>
      <p className="mt-2 text-muted">
        Export experiment summaries, simulation runs, and hybrid bridge reports.
      </p>
      <Link href="/analytics" className="mt-6 inline-block text-primary underline">
        View Analytics →
      </Link>
    </DashboardShell>
  );
}
