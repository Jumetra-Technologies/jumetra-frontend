import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { SEO, structuredData } from "@/lib/landing/content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: "/" } } : {}),
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    siteName: SEO.siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: SEO.title,
    description: SEO.description,
  },
};

export default function HomePage() {
  const jsonLd = JSON.stringify(structuredData(siteUrl));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <LandingPage />
    </>
  );
}
