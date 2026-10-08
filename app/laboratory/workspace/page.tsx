import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/sidebar";
import { EngineeringLab } from "@/components/lab/EngineeringLab";

export const metadata: Metadata = {
  title: "Engineering Lab",
  description: "Build circuits from 34 modelled parts, see where current flows, and run them in the browser.",
};

export default async function LaboratoryWorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <DashboardShell activePath="/laboratory/workspace" fullBleed>
      <EngineeringLab sessionId={one(params.session)} newForProject={one(params.project)} />
    </DashboardShell>
  );
}
