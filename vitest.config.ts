import { defineConfig } from "vitest/config";

/**
 * Unit-test config. Pure logic (validators, resume-progress math) runs under the
 * fast `node` environment; only files with a `// @vitest-environment jsdom`
 * docblock (the storage test, which needs `localStorage`/`DOMException`) opt into
 * jsdom. The `@/*` -> `./src/*` alias from tsconfig.json is honored via Vite's
 * native tsconfig-paths resolution so imports resolve.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Unit + tenancy-isolation suites only. The integration and end-to-end
    // suites need a running server and live in vitest.e2e.config.ts, so that
    // this lane stays fast enough that people actually run it.
    include: ["tests/unit/**/*.test.ts", "tests/security/**/*.test.ts"],
    globals: false,
  },
});
