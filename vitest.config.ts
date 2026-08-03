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
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
