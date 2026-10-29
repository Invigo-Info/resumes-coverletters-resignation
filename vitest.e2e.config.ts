import { defineConfig } from "vitest/config";

/**
 * Integration and end-to-end config - deliberately separate from the unit one.
 *
 * These suites need a real HTTP server, take tens of seconds, and some of them
 * drive a browser. Mixing them into `vitest.config.ts` would make the fast
 * feedback loop slow enough that people stop running it, which is how a unit
 * suite dies. `npm run test:run` stays sub-two-seconds; this is the slow lane.
 *
 * Runs single-threaded: every case talks to one shared server and some of them
 * create accounts, so parallel files would race on the same file store.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts", "tests/end-to-end/**/*.test.ts"],
    globals: false,
    globalSetup: ["tests/e2e-setup.ts"],
    // Browser launch plus a cold production server; the default 5s is far too
    // tight and produces flakes that look like real failures.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
