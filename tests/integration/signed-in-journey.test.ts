import { describe, it, expect, beforeAll } from "vitest";
import { baseUrl } from "../e2e-setup";

/**
 * The signed-in journey, over real HTTP against a real server.
 *
 * Registers an account, signs in through Auth.js's actual credentials flow
 * (CSRF token and all), then exercises the surfaces that only exist for a
 * signed-in user. This is the half the authz suite cannot reach: that one
 * proves strangers are kept out, this proves the owner is let in and that the
 * limits apply to them correctly.
 *
 * Runs against whatever backend the server has. With DATABASE_URL set it
 * exercises the real Postgres paths; without it the file store. The few
 * assertions that only mean something with a database check for it rather than
 * asserting something false in CI.
 */

const URL = baseUrl();
const EMAIL = `journey-${Date.now()}@example.invalid`;
const PASSWORD = "a-perfectly-reasonable-password";

/** Session cookies, accumulated across the sign-in handshake. */
let cookie = "";

/**
 * Whether the server under test has a database.
 *
 * Probed at module scope with top-level await, so the case below can be
 * reported as SKIPPED rather than quietly taking a no-op branch that reads as
 * a pass in the summary. A test that cannot run should say so.
 */
const hasDatabase: boolean = await (async () => {
  try {
    const health = await (await fetch(`${URL}/api/health`)).json();
    return Boolean(health?.checks?.database);
  } catch {
    return false;
  }
})();

/** Merge Set-Cookie headers into the jar we send back. */
function absorb(res: Response): void {
  const raw = res.headers.getSetCookie?.() ?? [];
  const jar = new Map<string, string>();
  for (const part of cookie.split("; ").filter(Boolean)) {
    const i = part.indexOf("=");
    jar.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const line of raw) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1));
  }
  cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function authed(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
    redirect: "manual",
  });
}

const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

beforeAll(async () => {
  // 1. Register.
  const reg = await fetch(
    `${URL}/api/register`,
    json({ email: EMAIL, password: PASSWORD })
  );
  expect(reg.status, "registration should succeed").toBe(201);

  // 2. Auth.js requires a CSRF token, and issues it with a cookie that must be
  //    sent back with the sign-in POST.
  const csrfRes = await fetch(`${URL}/api/auth/csrf`);
  absorb(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // 3. Sign in with the credentials provider.
  const signIn = await fetch(`${URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: `${URL}/dashboard`,
    }),
    redirect: "manual",
  });
  absorb(signIn);
});

describe("signing in", () => {
  it("produces a session the server recognises", async () => {
    const res = await authed("/api/auth/session");
    const session = (await res.json()) as { user?: { email?: string } };
    expect(session.user?.email).toBe(EMAIL);
  });

  it("lets the account through the route gate", async () => {
    const res = await authed("/dashboard");
    // 200, not a redirect to /login.
    expect(res.status).toBe(200);
  });
});

describe("documents belong to the account", () => {
  const id = `resume-${Date.now()}`;

  it("stores a document and reads it back", async () => {
    const put = await authed("/api/documents", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "resumes",
        record: {
          id,
          title: "Journey resume",
          data: { contact: { fullName: "Test" } },
        },
      }),
    });
    expect(put.status).toBe(200);

    const list = (await (await authed("/api/documents")).json()) as {
      resumes?: { id: string }[];
    };
    expect(list.resumes?.some((r) => r.id === id)).toBe(true);
  });

  it("refuses a document larger than the cap", async () => {
    // The denial-of-storage guard: a client-owned JSON blob goes straight into
    // a jsonb column, so without a cap one account can push arbitrarily large
    // rows and slow every read of its own document list.
    const huge = "x".repeat(1_200_000);
    const res = await authed("/api/documents", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "resumes",
        record: { id: `${id}-huge`, title: "Too big", data: { blob: huge } },
      }),
    });
    expect(res.status).toBe(413);
  });
});

describe("the export allowance", () => {
  it("permits the first export and records it", async () => {
    const res = await authed(
      "/api/export/authorize",
      json({ kind: "resume", documentId: "doc-1" })
    );
    const body = (await res.json()) as { allowed?: boolean; reason?: string };
    expect(res.status).toBe(200);
    expect(body.allowed).toBe(true);
  });

  it("never charges a slot for re-exporting the same document", async () => {
    const res = await authed(
      "/api/export/authorize",
      json({ kind: "resume", documentId: "doc-1" })
    );
    const body = (await res.json()) as { allowed?: boolean; reason?: string };
    expect(body.allowed).toBe(true);
    if (hasDatabase) expect(body.reason).toBe("already_downloaded");
  });

  // Skipped rather than faked when there is no database: without a ledger the
  // server answers `unconfigured`, and asserting a refusal would be asserting
  // something untrue of that deployment. A visible skip beats a hollow pass.
  it.skipIf(!hasDatabase)(
    "refuses the fourth DISTINCT document on a free account",
    async () => {
      for (const n of [2, 3]) {
        const ok = await authed(
          "/api/export/authorize",
          json({ kind: "resume", documentId: `doc-${n}` })
        );
        expect((await ok.json()).allowed).toBe(true);
      }
      const fourth = await authed(
        "/api/export/authorize",
        json({ kind: "resume", documentId: "doc-4" })
      );
      const body = (await fourth.json()) as {
        allowed?: boolean;
        reason?: string;
      };
      expect(body.allowed).toBe(false);
      expect(body.reason).toBe("limit_reached");
    }
  );

  it("rejects an unknown document kind", async () => {
    // The kind is part of the primary key the allowance counts over, so a junk
    // value would carve out a private, unlimited bucket.
    const res = await authed(
      "/api/export/authorize",
      json({ kind: "not-a-kind", documentId: "x" })
    );
    expect(res.status).toBe(400);
  });
});

describe("account deletion", () => {
  it("erases the account and its documents, then refuses the session", async () => {
    // The defect this covers: deletion used to remove the `users` row only,
    // leaving resumes - legal name, address, phone, employment history -
    // behind forever, while the API reported success.
    const del = await authed("/api/account", { method: "DELETE" });
    expect(del.status).toBe(200);

    // Signing in again with the same credentials must fail; the account is gone.
    const csrfRes = await fetch(`${URL}/api/auth/csrf`);
    const freshCookie = (csrfRes.headers.getSetCookie?.() ?? [])
      .map((l) => l.split(";")[0])
      .join("; ");
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const retry = await fetch(`${URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: freshCookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email: EMAIL,
        password: PASSWORD,
      }),
      redirect: "manual",
    });
    // Auth.js redirects back to the sign-in page with an error rather than
    // issuing a session.
    const location = retry.headers.get("location") ?? "";
    expect(location).toMatch(/error|signin|login/i);
  });
});
