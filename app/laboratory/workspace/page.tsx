import type { Metadata } from "next";
import { SignInRequired } from "@/components/auth/SignInRequired";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { PART_COUNTS } from "@kiungo/core/parts/catalog/counts";

export const metadata: Metadata = {
  title: "Engineering Lab",
  description: `Build circuits from ${PART_COUNTS.total} modeled parts, see where current flows and what each supply can give, and run them in the browser.`,
};

export default async function LaboratoryWorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <SignInRequired>
      <EngineeringLab sessionId={one(params.session)} newForProject={one(params.project)} />
    </SignInRequired>
  );
}
