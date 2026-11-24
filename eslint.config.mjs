import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

import { serverImportRules } from "./eslint/server-lint.config.mjs";
import serverBoundaries from "./eslint/server-boundaries.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "coverage/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "server-boundaries": serverBoundaries },
    rules: {
      "server-boundaries/layers": ["error", { appRoot, aliases: ["@/"] }],
    },
  },
  ...serverImportRules("@").map((block) => ({
    ...block,
    plugins: { "@typescript-eslint": tseslint.plugin },
  })),
]);

export default eslintConfig;
