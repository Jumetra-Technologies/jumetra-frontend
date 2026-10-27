import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// Workspace packages ship TypeScript source, so they're bundled, never left external.
const bundleWorkspace = { exclude: ["@kiungo/api", "@kiungo/core", "@kiungo/ui"] };

// SharedArrayBuffer (emulator pins) needs the page to be cross-origin isolated, in dev too.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  main: {
    build: { externalizeDeps: bundleWorkspace, rollupOptions: { input: { index: resolve(__dirname, "src/main/index.ts") } } },
  },
  preload: {
    build: { externalizeDeps: bundleWorkspace, rollupOptions: { input: { index: resolve(__dirname, "src/preload/index.ts") } } },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    server: { headers: isolation },
    preview: { headers: isolation },
    worker: { format: "es" },
    build: { rollupOptions: { input: { index: resolve(__dirname, "src/renderer/index.html") } } },
  },
});
