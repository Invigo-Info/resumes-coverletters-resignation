// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseKind } from "@/permissions/download-ledger";
import {
  authorizeDownload,
  useDownloadGate,
} from "@/permissions/resume-download-gate";

/**
 * The export allowance.
 *
 * What this replaces: `canDownload()` read a list of document ids out of
 * localStorage (`resume-co:downloads`) and compared its length to the limit,
 * and `recordDownload()` appended to that same list. Clearing site data reset
 * the counter, so "3 free downloads per kind" was in practice unlimited and the
 * paywall produced no reason to subscribe.
 *
 * The decision now comes from the server. These cases cover the client's half
 * of that contract - that it actually obeys a refusal, and that it does not
 * invent an allowance of its own when the server cannot be reached.
 */

const realFetch = globalThis.fetch;

/** Stub `fetch` with a single canned response. */
function stubFetch(
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  }));
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  useDownloadGate.setState({
    downloadedIds: { resume: [], coverLetter: [], resignationLetter: [] },
  });
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("parseKind", () => {
  it("accepts the three real kinds", () => {
    expect(parseKind("resume")).toBe("resume");
    expect(parseKind("coverLetter")).toBe("coverLetter");
    expect(parseKind("resignationLetter")).toBe("resignationLetter");
  });

  it("rejects anything else", () => {
    // The kind reaches a SQL check constraint, and is part of the primary key
    // the allowance is counted over - a junk value would carve out a private
    // unlimited bucket.
    expect(parseKind("resumes")).toBeNull();
    expect(parseKind("")).toBeNull();
    expect(parseKind("RESUME")).toBeNull();
    expect(parseKind(null)).toBeNull();
    expect(parseKind(undefined)).toBeNull();
    expect(parseKind(42)).toBeNull();
    expect(parseKind({ kind: "resume" })).toBeNull();
  });
});

describe("authorizeDownload (client)", () => {
  it("permits an export the server allows", async () => {
    stubFetch({ allowed: true, reason: "within_allowance", used: 1, limit: 3 });
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("within_allowance");
    expect(r.used).toBe(1);
  });

  it("OBEYS a refusal", async () => {
    // The whole point. Previously nothing on the server could say no.
    stubFetch({ allowed: false, reason: "limit_reached", used: 3, limit: 3 });
    const r = await authorizeDownload("resume", "doc-4");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("limit_reached");
  });

  it("sends the kind and document id the server needs", async () => {
    const fn = stubFetch({ allowed: true, reason: "premium", used: 9, limit: 3 });
    await authorizeDownload("coverLetter", "letter-7");
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/export/authorize");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      kind: "coverLetter",
      documentId: "letter-7",
    });
  });

  it("does not mark a refused document as downloaded", async () => {
    // The badge cache must not claim an export that never happened.
    stubFetch({ allowed: false, reason: "limit_reached", used: 3, limit: 3 });
    await authorizeDownload("resume", "doc-9");
    expect(useDownloadGate.getState().downloadedIds.resume).not.toContain(
      "doc-9"
    );
  });

  it("marks an allowed document as downloaded, once", async () => {
    stubFetch({ allowed: true, reason: "within_allowance", used: 1, limit: 3 });
    await authorizeDownload("resume", "doc-1");
    await authorizeDownload("resume", "doc-1");
    expect(useDownloadGate.getState().downloadedIds.resume).toEqual(["doc-1"]);
  });

  it("fails CLOSED when the request is blocked or the network is down", async () => {
    // This is the case that decides whether the whole phase is worth anything.
    // Failing open would mean a single ad-blocker rule against
    // /api/export/authorize restores the unlimited free tier - no developer
    // tools, no patched JavaScript, just a blocked request.
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unavailable");
  });

  it("does not send the user to /payment for an infrastructure failure", async () => {
    // A subscriber who hits a dropped connection must not be shown an upgrade
    // page - that reads as "your subscription is gone". They get a retry.
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.shouldUpsell).toBe(false);
  });

  it("DOES send the user to /payment when the allowance is spent", async () => {
    stubFetch({ allowed: false, reason: "limit_reached", used: 3, limit: 3 });
    const r = await authorizeDownload("resume", "doc-4");
    expect(r.shouldUpsell).toBe(true);
  });

  it("treats a non-JSON response as a refusal, not an approval", async () => {
    // `allowed` absent means the server did not say yes. Defaulting to true
    // here would reinstate exactly the bug this replaces.
    const fn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    }));
    globalThis.fetch = fn as unknown as typeof fetch;
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unavailable");
  });

  it("treats a 5xx as an outage rather than a verdict", async () => {
    stubFetch(
      { allowed: false, reason: "unavailable" },
      { ok: false, status: 503 }
    );
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.ok).toBe(false);
    expect(r.shouldUpsell).toBe(false);
  });

  it("treats a 401 as a refusal that should prompt sign-in/upgrade", async () => {
    stubFetch(
      { allowed: false, reason: "unauthenticated" },
      { ok: false, status: 401 }
    );
    const r = await authorizeDownload("resume", "doc-1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unauthenticated");
    expect(r.shouldUpsell).toBe(true);
  });
});
