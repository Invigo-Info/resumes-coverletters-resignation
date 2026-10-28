import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference and tooling material, not application code: none of it is
    // tracked in git, nothing under src/ imports it, and none of it ships. It
    // was contributing 127 of 189 lint errors (a vendored React copy, a bundled
    // design-system dump, a one-file design reference, and a skills script),
    // which drowned out the 62 real errors in src/. Linting it tells us nothing.
    "ds-bundle/**",
    "design-ref/**",
    "agent-skills/**",
  ]),
]);

export default eslintConfig;
