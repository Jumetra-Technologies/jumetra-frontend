/** @type {import('next').NextConfig} */
const CLOUD_API = "https://api-aoxa3kagvq-ez.a.run.app";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: isProduction
      ? "/backend"
      : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    NEXT_PUBLIC_WS_URL: isProduction
      ? process.env.NEXT_PUBLIC_WS_URL ?? `wss://${CLOUD_API.replace(/^https?:\/\//, "")}`
      : process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000",
    JUMETRA_BACKEND_URL: process.env.JUMETRA_BACKEND_URL ?? CLOUD_API,
  },
};

export default nextConfig;
