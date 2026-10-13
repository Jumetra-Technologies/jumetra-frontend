import type { Metadata } from "next";
import { SystemDiagnostics } from "@/components/diagnostics/SystemDiagnostics";

export const metadata: Metadata = {
  title: "Kiungo",
  robots: { index: false, follow: false },
};

/** Administrators' System Diagnostics. Not linked anywhere; see lib/diagnostics/access.ts. */
export default function SystemPage() {
  return <SystemDiagnostics />;
}
