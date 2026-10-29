import { describe, it, expect } from "vitest";
import { baseUrl } from "../e2e-setup";

/**
 * Authorization, against a real running server.
 *
 * The audit's gap was explicit: "Negative / abuse tests - no tampering or
 * authz-bypass cases". Every assertion here is an attempt to get at something
 * without being entitled to it, and every one of them should fail.
 *
 * These complement rather than repeat the unit tests. A unit test proves the
 * gate function returns false; this proves the deployed route actually calls
 * it - which is where the gap between "the logic is right" and "the endpoint is
 * safe" usually lives.
 */

const URL = baseUrl();

/** Call an API route with no credentials whatsoever. */
async function anon(
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${URL}${path}`, {
    ...init,
    // Never follow a redirect: a 307 to /login IS the result being asserted.
    redirect: "manual",
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* HTML or empty */
  }
  return { status: res.status, body };
}

const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

describe("unauthenticated access to account data", () => {
  it("refuses to list documents", async () => {
    const { status } = await anon("/api/documents");
    expect(status).toBe(401);
  });

  it("refuses to write a document", async () => {
    const { status } = await anon(
      "/api/documents",
      json({ type: "resumes", record: { id: "x", title: "x", data: {} } })
    );
    // 401 unauthorized, or 405 if the route takes PUT rather than POST -
    // either way it is not a successful write.
    expect([401, 405]).toContain(status);
  });

  it("refuses to delete an account", async () => {
    const { status } = await anon("/api/account", { method: "DELETE" });
    expect(status).toBe(401);
  });

  it("refuses to open a billing portal session", async () => {
    const { status } = await anon("/api/billing/portal", { method: "POST" });
    expect(status).toBe(401);
  });

  it("refuses to start checkout", async () => {
    // Without a session the webhook could never attribute the payment, so an
    // anonymous checkout means charging someone and granting them nothing.
    const { status } = await anon("/api/checkout/session", json({ plan: "trial" }));
    expect(status).toBe(401);
  });

  it("refuses to authorize an export", async () => {
    const { status, body } = await anon(
      "/api/export/authorize",
      json({ kind: "resume", documentId: "anything" })
    );
    expect(status).toBe(401);
    expect((body as { allowed?: boolean })?.allowed).toBeFalsy();
  });

  it("reports entitlement as NOT premium", async () => {
    const { status, body } = await anon("/api/entitlement");
    expect(status).toBe(200);
    expect((body as { premium?: boolean })?.premium).toBe(false);
  });
});

describe("the route gate", () => {
  const protectedPaths = [
    "/dashboard",
    "/account",
    "/jobs",
    "/tailoring",
    "/resumes/write/contact",
    "/interview-prep",
  ];

  for (const path of protectedPaths) {
    it(`sends a signed-out visitor from ${path} to /login`, async () => {
      const res = await fetch(`${URL}${path}`, { redirect: "manual" });
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });
  }

  it("does NOT let a forged session cookie through", async () => {
    // Cookie PRESENCE used to be the whole check, so any value at all got a
    // stranger into the signed-in shell. The gate now decrypts the JWE.
    const res = await fetch(`${URL}/dashboard`, {
      headers: { cookie: "authjs.session-token=totally-made-up-value" },
      redirect: "manual",
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  for (const path of ["/", "/login", "/privacy", "/terms", "/forgot-password"]) {
    it(`leaves ${path} reachable while signed out`, async () => {
      const res = await fetch(`${URL}${path}`, { redirect: "manual" });
      expect(res.status).toBe(200);
    });
  }
});

describe("the Stripe webhook", () => {
  it("rejects an unsigned request", async () => {
    // Without signature verification anyone could POST a
    // checkout.session.completed and grant themselves premium for free.
    const { status } = await anon(
      "/api/stripe/webhook",
      json({ type: "checkout.session.completed", data: { object: {} } })
    );
    // 400 missing/invalid signature, or 503 when Stripe is unconfigured in
    // this environment. Never 200.
    expect([400, 503]).toContain(status);
  });

  it("rejects a request carrying a bogus signature", async () => {
    const res = await fetch(`${URL}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=deadbeef",
      },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });
    expect([400, 503]).toContain(res.status);
  });
});

describe("input validation at the trust boundary", () => {
  it("rejects a malformed registration body", async () => {
    const { status } = await anon("/api/register", json({ email: "not-an-email" }));
    expect(status).toBe(400);
  });

  it("rejects a password that is too short", async () => {
    const { status } = await anon(
      "/api/register",
      json({ email: `probe-${Date.now()}@example.invalid`, password: "short" })
    );
    expect(status).toBe(400);
  });

  it("does not leak whether an address is registered", async () => {
    // The password-reset endpoint must answer identically for a known and an
    // unknown address, or it becomes a lookup for who uses this site - which
    // on a resume product means who is job hunting.
    const a = await anon(
      "/api/auth/password/request",
      json({ email: `nobody-${Date.now()}@example.invalid` })
    );
    const b = await anon(
      "/api/auth/password/request",
      json({ email: "someone@example.invalid" })
    );
    expect(a.status).toBe(b.status);
    expect(JSON.stringify(a.body)).toBe(JSON.stringify(b.body));
  });

  it("refuses an invalid password-reset token", async () => {
    const { status } = await anon(
      "/api/auth/password/reset",
      json({ token: "x".repeat(43), password: "a-perfectly-fine-password" })
    );
    expect(status).toBe(400);
  });
});

describe("the health probe", () => {
  it("answers, and discloses nothing sensitive", async () => {
    const { status, body } = await anon("/api/health");
    expect(status).toBe(200);
    const text = JSON.stringify(body);
    // Capability booleans are fine; a connection string, path or version is not.
    expect(text).not.toMatch(/postgres:|postgresql:|sk_live|sk_test|password/i);
    expect(text).not.toMatch(/[A-Za-z]:\\\\|\/home\/|\/Users\//);
  });
});
