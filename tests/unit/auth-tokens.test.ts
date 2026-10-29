// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Password-reset and email-verification tokens.
 *
 * A reset token is a password equivalent - whoever holds a live one owns the
 * account - so the properties asserted here are the whole security of the
 * flow, not nice-to-haves:
 *
 *   - single use, so a link cannot be replayed after it has been spent
 *   - expiring, so an old mail in a mailbox someone has lost access to is dead
 *   - purpose-bound, so a low-value verification link cannot be redeemed as a
 *     password reset
 *   - never stored in plaintext, so a leaked backup is not a list of working
 *     account takeovers
 *   - revocable in bulk, so completing a reset kills every other pending link
 *
 * Runs against the file backend (DATABASE_URL is unset in tests) with an
 * in-memory fs mock, so it never touches the real .data/ files.
 */

const files = new Map<string, string>();

vi.mock("fs", () => ({
  promises: {
    readFile: async (p: string) => {
      if (!files.has(p)) {
        const err = new Error("ENOENT") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      return files.get(p) as string;
    },
    writeFile: async (p: string, data: string) => {
      files.set(p, data);
    },
    mkdir: async () => undefined,
  },
}));

import {
  createAuthToken,
  consumeAuthToken,
  invalidateAuthTokens,
  countRecentTokens,
  pruneAuthTokens,
  TOKEN_TTL_MS,
} from "@/services/database/auth-tokens";

const EMAIL = "alice@example.com";

beforeEach(() => {
  files.clear();
});

/** Everything the store has written, as raw text. */
function storedText(): string {
  return [...files.values()].join("\n");
}

describe("auth tokens", () => {
  it("issues a token that can be spent once", async () => {
    const token = await createAuthToken(EMAIL, "password_reset");
    expect(await consumeAuthToken(token, "password_reset")).toBe(EMAIL);
    // The replay. This is the single most important assertion in the file.
    expect(await consumeAuthToken(token, "password_reset")).toBeNull();
  });

  it("NEVER stores the token itself, only a hash", async () => {
    const token = await createAuthToken(EMAIL, "password_reset");
    const text = storedText();
    // A leaked backup must not contain anything replayable.
    expect(text).not.toContain(token);
    // ...but it does hold a 64-char sha256 hex digest bound to the email.
    expect(text).toContain(EMAIL);
    expect(text).toMatch(/[0-9a-f]{64}/);
  });

  it("rejects an expired token", async () => {
    const issuedAt = 1_000_000;
    const token = await createAuthToken(EMAIL, "password_reset", issuedAt);
    const justBefore = issuedAt + TOKEN_TTL_MS.password_reset - 1;
    const justAfter = issuedAt + TOKEN_TTL_MS.password_reset + 1;

    // Still good a millisecond before expiry...
    expect(
      await consumeAuthToken(token, "password_reset", justBefore)
    ).toBe(EMAIL);

    // ...and a fresh one is dead a millisecond after.
    const second = await createAuthToken(EMAIL, "password_reset", issuedAt);
    expect(
      await consumeAuthToken(second, "password_reset", justAfter)
    ).toBeNull();
  });

  it("refuses to redeem a verification token as a password reset", async () => {
    // Purpose binding. A verify link is long-lived and handed out freely at
    // sign-up; if it could be spent as a reset, that would be a free takeover.
    const token = await createAuthToken(EMAIL, "email_verify");
    expect(await consumeAuthToken(token, "password_reset")).toBeNull();
    // Still intact for what it was actually issued for.
    expect(await consumeAuthToken(token, "email_verify")).toBe(EMAIL);
  });

  it("rejects an unknown token", async () => {
    await createAuthToken(EMAIL, "password_reset");
    expect(
      await consumeAuthToken("not-a-real-token-value-at-all", "password_reset")
    ).toBeNull();
  });

  it("invalidates every other outstanding reset link", async () => {
    // The scenario: an attacker requested a reset, then the real user requested
    // one and completed it. The attacker's link must be dead afterwards.
    const attackers = await createAuthToken(EMAIL, "password_reset");
    const users = await createAuthToken(EMAIL, "password_reset");

    expect(await consumeAuthToken(users, "password_reset")).toBe(EMAIL);
    await invalidateAuthTokens(EMAIL, "password_reset");

    expect(await consumeAuthToken(attackers, "password_reset")).toBeNull();
  });

  it("leaves another account's tokens alone when invalidating", async () => {
    const mine = await createAuthToken(EMAIL, "password_reset");
    const theirs = await createAuthToken("bob@example.com", "password_reset");
    await invalidateAuthTokens(EMAIL, "password_reset");
    expect(await consumeAuthToken(mine, "password_reset")).toBeNull();
    expect(await consumeAuthToken(theirs, "password_reset")).toBe(
      "bob@example.com"
    );
  });

  it("does not invalidate across purposes", async () => {
    const verify = await createAuthToken(EMAIL, "email_verify");
    await invalidateAuthTokens(EMAIL, "password_reset");
    expect(await consumeAuthToken(verify, "email_verify")).toBe(EMAIL);
  });

  it("treats the email case-insensitively", async () => {
    // Addresses are normalised on the way in, so a mixed-case request must not
    // create a second, separate identity with its own token allowance.
    const token = await createAuthToken("Alice@Example.COM", "password_reset");
    expect(await consumeAuthToken(token, "password_reset")).toBe(EMAIL);
  });

  it("counts recent tokens per email and purpose, for throttling", async () => {
    const now = 5_000_000;
    await createAuthToken(EMAIL, "password_reset", now - 10_000);
    await createAuthToken(EMAIL, "password_reset", now - 5_000);
    await createAuthToken(EMAIL, "email_verify", now - 5_000);
    await createAuthToken("bob@example.com", "password_reset", now - 5_000);

    expect(
      await countRecentTokens(EMAIL, "password_reset", now - 20_000)
    ).toBe(2);
    // Outside the window.
    expect(await countRecentTokens(EMAIL, "password_reset", now - 6_000)).toBe(
      1
    );
    // Other purposes and other accounts are not counted.
    expect(await countRecentTokens(EMAIL, "email_verify", now - 20_000)).toBe(1);
  });

  it("prunes long-expired tokens but keeps live ones", async () => {
    const now = 9_000_000_000;
    // Expired well over a day ago.
    const old = await createAuthToken(
      EMAIL,
      "password_reset",
      now - 10 * 24 * 60 * 60 * 1000
    );
    const live = await createAuthToken(EMAIL, "password_reset", now);

    await pruneAuthTokens(now);

    // The pruned row is physically gone from the store, not merely refused.
    expect(storedText()).not.toContain(String(now - 10 * 24 * 60 * 60 * 1000));
    expect(await consumeAuthToken(old, "password_reset", now)).toBeNull();
    // The live one survived the prune.
    expect(await consumeAuthToken(live, "password_reset", now)).toBe(EMAIL);
  });

  it("gives every token a distinct high-entropy value", async () => {
    // Sequential: the file backend is read-modify-write, and concurrent
    // creates would drop rows, which has nothing to do with token entropy.
    const tokens: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      tokens.push(await createAuthToken(EMAIL, "password_reset"));
    }
    expect(new Set(tokens).size).toBe(25);
    for (const t of tokens) {
      // 32 random bytes in base64url is 43 chars.
      expect(t.length).toBeGreaterThanOrEqual(43);
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});
