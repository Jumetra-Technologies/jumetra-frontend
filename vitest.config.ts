import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}", "packages/*/test/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // jsdom has no canvas, which the Lottie player needs as it loads: tests get one that draws nothing.
      "lottie-web/build/player/lottie_light": path.resolve(__dirname, "__tests__/stubs/lottie-player.ts"),
    },
  },
});
