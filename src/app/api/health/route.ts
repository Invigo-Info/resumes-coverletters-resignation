import { NextResponse } from "next/server";
import { isDbEnabled } from "@/services/database/db";
import { isSharedRateLimit } from "@/permissions/rate-limit";

/** Never cache the health check - it must reflect the instance right now. */
export const dynamic = "force-dynamic";

/**
 * GET /api/health - lightweight liveness probe for uptime / synthetic monitors
 * (Checkly, BetterStack, etc.). Returns 200 with `{ status: "ok" }` and a few
 * non-sensitive capability booleans so a monitor can assert the service is up
 * and which integrations are configured. Intentionally does NOT touch the
 * database or any paid API, so it is cheap and cannot raise false alarms.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    checks: {
      database: isDbEnabled(),
      sharedRateLimit: isSharedRateLimit(),
      ai: Boolean(process.env.GEMINI_API_KEY),
    },
  });
}
