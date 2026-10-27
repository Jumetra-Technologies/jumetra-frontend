import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

// The app version, from package.json (see CHANGELOG.md for how it's bumped).
const APP_VERSION = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string }).version;
const PRODUCTION_API_URL = "https://europe-west4-hhipsystemv0.cloudfunctions.net/api";
const PRODUCTION_WS_URL = "wss://api-aoxa3kagvq-ez.a.run.app";
const localDevOrigins = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address),
);
const localDevHostnames = localDevOrigins.flatMap((address) => [`${address}.nip.io`]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...localDevOrigins, ...localDevHostnames],
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
