/** @type {import('next').NextConfig} */
const FIREBASE_API_URL = "https://europe-west4-hhipsystemv0.cloudfunctions.net/api";
const FIREBASE_WS_URL = "wss://api-aoxa3kagvq-ez.a.run.app";

const nextConfig = {
  // Pages renamed in the Kiungo rebrand keep their old addresses working.
  async redirects() {
    return [
      { source: "/docs/system-overview/what-is-hhip", destination: "/docs/system-overview/what-is-kiungo", permanent: true },
      { source: "/docs/system-overview/how-hhip-works", destination: "/docs/system-overview/how-kiungo-works", permanent: true },
      { source: "/learn/getting-started-with-hhip", destination: "/learn/getting-started-with-kiungo", permanent: true },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NODE_ENV === "production"
        ? FIREBASE_API_URL
        : process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
    NEXT_PUBLIC_WS_URL:
      process.env.NODE_ENV === "production"
        ? FIREBASE_WS_URL
        : process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000",
  },
};

export default nextConfig;
