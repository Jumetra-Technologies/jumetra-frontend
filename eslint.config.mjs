import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The desktop app isn't a Next.js app; Next's page rules don't apply to it.
  {
    files: ["apps/desktop/**"],
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // EMU-04: a simulation is decided by its program, its inputs and its seed, never by
  // the wall clock or Math.random, so the same run can be repeated cycle for cycle.
  {
    files: ["packages/core/src/emulator/**", "packages/core/src/sim/**", "packages/core/src/boards/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use seeded() from @kiungo/core/sim/random so runs repeat." },
        { object: "Date", property: "now", message: "Simulated time comes from CPU cycles or world steps, not the wall clock." },
        { object: "performance", property: "now", message: "Simulated time comes from CPU cycles or world steps, not the wall clock." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "Simulated time comes from CPU cycles or world steps, not the wall clock." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The MCP server is its own package with its own tsconfig.
    "mcp/**",
    // Generated copy of the code editor (scripts/copy-monaco.mjs).
    "public/monaco/**",
    // Desktop build output.
    "apps/desktop/out/**",
    "apps/desktop/dist/**",
  ]),
]);

export default eslintConfig;
