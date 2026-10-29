import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Boots a real production server for the integration and end-to-end suites, and
 * tears it down afterwards.
 *
 * `next start`, not `next dev`. The dev server compiles each route on first
 * request, which turns the first hit on every path into a multi-second wait and
 * produces exactly the kind of timeout flake that trains people to ignore a red
 * suite. It also means these tests exercise the build that would actually ship.
 *
 * Set E2E_BASE_URL to point at a server you are already running (handy while
 * writing tests) and this starts nothing.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const OWN_URL = `http://localhost:${PORT}`;

let server: ChildProcess | null = null;

/** The address the suites talk to. */
export function baseUrl(): string {
  return process.env.E2E_BASE_URL || OWN_URL;
}

/** Poll until the server answers its own health probe, or give up. */
async function waitForReady(url: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Server at ${url} did not become ready within ${timeoutMs}ms (last: ${lastError})`
  );
}

export async function setup(): Promise<void> {
  if (process.env.E2E_BASE_URL) {
    await waitForReady(process.env.E2E_BASE_URL, 15_000);
    return;
  }

  if (!existsSync(".next")) {
    throw new Error(
      "No .next build found. These suites run against a production build:\n" +
        "  npm run build && npm run test:e2e\n" +
        "Or point them at a server you are already running:\n" +
        "  E2E_BASE_URL=http://localhost:3001 npm run test:e2e"
    );
  }

  // Spawn node against Next's own bin script rather than `npx`. On Windows,
  // spawning the `npx.cmd` shim without a shell fails with EINVAL on current
  // Node, and turning the shell on to work around that invites quoting bugs in
  // the one piece of plumbing every integration test depends on.
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        // Auth.js refuses to start without a secret. A fixed value keeps
        // sessions reproducible across runs; it never leaves the test process.
        AUTH_SECRET:
          process.env.AUTH_SECRET || "e2e-placeholder-secret-not-for-real-use",
        NODE_ENV: "production",
      },
    }
  );

  // Surface a crash rather than letting it look like a slow start.
  let output = "";
  server.stdout?.on("data", (d) => (output += String(d)));
  server.stderr?.on("data", (d) => (output += String(d)));
  server.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[e2e] server exited with ${code}:\n${output}`);
    }
  });

  try {
    await waitForReady(OWN_URL);
  } catch (err) {
    console.error(`[e2e] server output:\n${output}`);
    throw err;
  }
}

export async function teardown(): Promise<void> {
  if (!server) return;
  const pid = server.pid;
  server.kill();
  // Belt and braces on Windows: a server left holding the port makes the NEXT
  // run fail with a confusing "port in use" rather than anything to do with
  // the tests. /t also takes any child processes Next spawned.
  if (pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    } catch {
      /* best effort */
    }
  }
  server = null;
}
