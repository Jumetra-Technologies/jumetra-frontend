import { KiungoLoader } from "@/components/brand/KiungoMark";
import { DashboardShell } from "@/components/layout/sidebar";

/** Any page without its own loading screen shows the Kiungo mark while it streams in. */
export default function Loading() {
  return (
    <DashboardShell activePath="">
      <div className="flex min-h-[60svh] items-center justify-center">
        <KiungoLoader label="Loading" size="lg" />
      </div>
    </DashboardShell>
  );
}
