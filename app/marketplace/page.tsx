import Link from "next/link";

export default function MarketplacePage() {
  return (
    <>
      <h2 className="text-2xl font-bold">Hardware catalog</h2>
      <p className="mt-2 text-muted">The component catalog is the supported place to find hardware profiles and controller compatibility.</p>
      <Link href="/components" className="mt-6 inline-block text-primary underline">
        Open hardware catalog →
      </Link>
    </>
  );
}
