import { DashboardShell } from "@/components/layout/sidebar";
import { ReportCenter } from "@/components/reports/ReportCenter";

export default function ReportsPage() {
  return (
    <DashboardShell activePath="/reports">
      <ReportCenter />
    </DashboardShell>
  );
}
