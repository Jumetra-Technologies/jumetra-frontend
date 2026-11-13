import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

// The app version, from package.json (see CHANGELOG.md for how it's bumped).
const APP_VERSION = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string }).version;
// The desktop app's version in this checkout: the home page offers its GitHub release (lib/releases.ts).
const DESKTOP_VERSION = (JSON.parse(readFileSync(join(process.cwd(), "apps/desktop/package.json"), "utf8")) as { version: string }).version;
const PRODUCTION_API_URL = "https://europe-west4-hhipsystemv0.cloudfunctions.net/api";
const PRODUCTION_WS_URL = "wss://api-aoxa3kagvq-ez.a.run.app";
const localDevOrigins = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address),
);
const localDevHostnames = localDevOrigins.flatMap((address) => [`${address}.nip.io`]);

/**
 * Security headers on every page (audit WEB-002, 13 Nov 2026).
 *
 * - No other site may frame Kiungo (`frame-ancestors 'none'`, and `X-Frame-Options` for old
 *   browsers): the desktop sign-in approval page could otherwise be clickjacked.
 * - The CSP stops there on purpose: plugins and `<base>` are refused, but scripts, styles and
 *   connections aren't restricted yet, because Firebase sign-in, Monaco, the compile service and
 *   the admin server each need theirs listed and checked in a browser first.
 * - No Permissions-Policy for geolocation (the welcome dialog asks for it) or serial (the
 *   Firmware page flashes over Web Serial); camera, microphone and payments are off.
 * - No Cross-Origin-Opener-Policy: Firebase's sign-in popup talks back through its opener.
 */
export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...localDevOrigins, ...localDevHostnames],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Pages renamed in the Kiungo rebrand keep their old addresses working.
  async redirects() {
    return [
      { source: "/docs/system-overview/what-is-hhip", destination: "/docs/system-overview/what-is-kiungo", permanent: true },
      { source: "/docs/system-overview/how-hhip-works", destination: "/docs/system-overview/how-kiungo-works", permanent: true },
      { source: "/learn/getting-started-with-hhip", destination: "/learn/getting-started-with-kiungo", permanent: true },
      // System Diagnostics was removed (v1.6.1); its metrics are in Advanced Analytics.
      { source: "/dashboard", destination: "/analytics", permanent: true },
      // Architecture and Roadmap moved into Documentation (v1.8.0).
      { source: "/architecture", destination: "/docs/architecture", permanent: true },
      { source: "/roadmap", destination: "/docs/roadmap", permanent: true },
      // Reports moved: export from Experiment Records; the full report center is in System Diagnostics (v1.10.0).
      { source: "/reports", destination: "/experiments", permanent: true },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_DESKTOP_VERSION: DESKTOP_VERSION,
    NEXT_PUBLIC_API_URL:
      process.env.NODE_ENV === "production"
        ? PRODUCTION_API_URL
        : process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
    NEXT_PUBLIC_WS_URL:
      process.env.NODE_ENV === "production"
        ? PRODUCTION_WS_URL
        : process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000",
  },
};

export default nextConfig;
