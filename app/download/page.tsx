import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@kiungo/ui/button";
import { DownloadPicker } from "@/components/download/DownloadPicker";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { latestRelease } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download Kiungo for Windows, macOS and Linux",
  description: "Kiungo for your computer: run your own Arduino code on an emulated board or a real one, with the parts you don't have played by the lab. Free for students and schools.",
};

const container = "mx-auto w-full max-w-[1120px] px-5 sm:px-8 lg:px-10";

/** What the desktop app adds to the website, in the order a student meets it. */
const WHAT = [
  { title: "Your own code runs", text: "Write a sketch beside the circuit. Run builds it on your computer and runs it on an emulated Uno, at real speed, with sensors that answer it." },
  { title: "Real boards join in", text: "Plug in an Arduino Uno and mark it Physical. Your code runs on it while the lab plays the parts you don't have, and an emergency stop is always one key away." },
  { title: "Robots that drive", text: "Two motors make a robot. It drives round a course in a 2D world, and you can move the walls while it runs." },
  { title: "Works offline", text: "Projects are folders on your computer. Sign in once; after that, building, running and uploading need no internet." },
];

export default async function DownloadPage() {
  const release = await latestRelease();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background" data-testid="download-page">
      <header className={`${container} pt-14 pb-10 sm:pt-20 lg:pt-24`}>
        <p className="text-sm font-semibold text-primary">Kiungo for your computer{release ? `, version ${release.version}` : ""}</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl">Build it here, then run it for real.</h1>
        <p className="mt-6 max-w-[56ch] text-lg leading-8 text-muted">
          The website is where you start. The desktop app is where the code runs: on an emulated board, on a real one, or both at once. Free for students, clubs and schools.
        </p>
        <div className="mt-10">
          {release ? (
            <DownloadPicker release={release} />
          ) : (
            <div className="max-w-[60ch] rounded-[14px] border border-border bg-surface px-5 py-4" data-testid="download-soon">
              <p className="text-[15px] font-semibold text-foreground">The desktop app is in beta with pilot schools.</p>
              <p className="mt-1 text-[14px] leading-6 text-muted">Its download appears here when it&apos;s released. Until then, everything on the website works in your browser.</p>
              <Link href="/laboratory/workspace" className="mt-4 inline-flex">
                <Button>Open the lab in your browser</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className={`${container} pb-24`}>
        <section aria-labelledby="what-heading" className="border-t border-border pt-12">
          <h2 id="what-heading" className="text-2xl font-bold tracking-[-0.02em] text-foreground">
            What the app adds
          </h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {WHAT.map((item) => (
              <div key={item.title}>
                <dt className="text-[17px] font-semibold text-foreground">{item.title}</dt>
                <dd className="mt-1.5 max-w-[48ch] text-[15px] leading-7 text-muted">{item.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="needs-heading" className="mt-16 border-t border-border pt-12">
          <h2 id="needs-heading" className="text-2xl font-bold tracking-[-0.02em] text-foreground">
            What your computer needs
          </h2>
          <ul className="mt-6 max-w-[64ch] list-disc space-y-2 pl-5 text-[15px] leading-7 text-muted">
            <li>Windows 10 or 11, macOS 12 or later, or a 64-bit Linux (Ubuntu 22.04, Fedora 39 or similar).</li>
            <li>4 GB of memory and about 1 GB of disk space, plus room for your projects.</li>
            <li>An internet connection the first time you sign in, and the first time you build for a board.</li>
            <li>For real boards: a USB port and a data cable. Clone boards with a CH340 chip may need its driver; the app tells you when.</li>
          </ul>
          {release?.notes ? (
            <details className="mt-10 max-w-[72ch]">
              <summary className="cursor-pointer text-[15px] font-semibold text-foreground">What&apos;s new in {release.version}</summary>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-7 text-muted">{release.notes}</p>
            </details>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
