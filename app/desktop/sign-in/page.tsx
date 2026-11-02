import type { Metadata } from "next";
import { DesktopSignIn } from "@/components/auth/DesktopSignIn";

export const metadata: Metadata = {
  title: "Sign in to Kiungo on your computer",
  description: "Approve the Kiungo desktop app on your computer.",
  robots: { index: false, follow: false },
};

export default async function DesktopSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const codeId = Array.isArray(params.code_id) ? params.code_id[0] : params.code_id;
  return <DesktopSignIn codeId={codeId ?? null} />;
}
