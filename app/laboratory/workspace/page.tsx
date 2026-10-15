import type { Metadata } from "next";
import { SignInRequired } from "@/components/auth/SignInRequired";
import { EngineeringLab } from "@/components/lab/EngineeringLab";

export const metadata: Metadata = {
  title: "Engineering Lab",
  description: "Build circuits from 34 modeled parts, see where current flows, and run them in the browser.",
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
