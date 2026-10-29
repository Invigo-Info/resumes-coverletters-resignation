import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";
import { getSql, isDbEnabled } from "./db";

/**
 * Single-use, expiring, email-bound tokens for password reset and email
 * verification. File-backed for zero-setup local dev, Postgres when
 * DATABASE_URL is set - same dual-backend shape as `users.ts`.
 *
 * The token is returned to the caller ONCE, at creation, to be emailed. Only
 * its sha256 hash is persisted, so the store never holds anything replayable:
 * a leaked backup or a stray query result cannot be used to take an account.
 * See database/migrations/0003_auth_tokens.sql for why plain sha256 is the
 * right choice for a 32-byte random token.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const TOKENS_FILE = path.join(DATA_DIR, "auth-tokens.json");

export type TokenPurpose = "password_reset" | "email_verify";

/** How long each kind of token stays valid. */
export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  // Short: a reset link is a password equivalent, and it lands in a mailbox
  // that may be shared, synced to other devices, or already compromised.
  password_reset: 60 * 60 * 1000, // 1 hour
  // Longer: verification is not sensitive, and a link that dies before the user
  // gets round to their inbox just creates support load.
  email_verify: 24 * 60 * 60 * 1000, // 24 hours
};

interface StoredToken {
  tokenHash: string;
  email: string;
  purpose: TokenPurpose;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** sha256 hex of a token. The only form that is ever persisted. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A fresh token: 32 bytes of CSPRNG output, base64url so it survives a URL
 * without encoding. 256 bits is far beyond guessable, which is what lets the
 * token stand alone as proof of mailbox control.
 */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/* --------------------------- file backend --------------------------- */

async function readTokens(): Promise<StoredToken[]> {
  try {
    return JSON.parse(await fs.readFile(TOKENS_FILE, "utf8")) as StoredToken[];
  } catch {
    return [];
  }
}

async function writeTokens(tokens: StoredToken[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

/* ---------------------------- public API ---------------------------- */

/**
 * Issue a token for `email` and return the PLAINTEXT token to email out. It is
 * not recoverable afterwards - only its hash is stored.
 */
export async function createAuthToken(
  email: string,
  purpose: TokenPurpose,
  now: number = Date.now()
): Promise<string> {
  const token = generateToken();
  const row: StoredToken = {
    tokenHash: hashToken(token),
    email: normalize(email),
    purpose,
    expiresAt: now + TOKEN_TTL_MS[purpose],
    usedAt: null,
    createdAt: now,
  };

  if (isDbEnabled()) {
    const sql = getSql();
    await sql`
      insert into auth_tokens (token_hash, email, purpose, expires_at, used_at, created_at)
      values (${row.tokenHash}, ${row.email}, ${row.purpose}, ${row.expiresAt}, null, ${row.createdAt})
    `;
  } else {
    const tokens = await readTokens();
    tokens.push(row);
    await writeTokens(tokens);
  }
  return token;
}

/**
 * Atomically spend a token: returns the email it was bound to, or null if the
 * token is unknown, expired, or already used.
 *
 * Atomicity is the point. A check-then-update would let two requests arriving
 * together both pass the check and both reset the password - and more usefully
 * for an attacker, it turns a single-use token into a reusable one under load.
 * The Postgres path does it in one statement whose WHERE clause carries the
 * conditions, so exactly one caller can ever get a row back.
 */
export async function consumeAuthToken(
  token: string,
  purpose: TokenPurpose,
  now: number = Date.now()
): Promise<string | null> {
  const tokenHash = hashToken(token);

  if (isDbEnabled()) {
    const sql = getSql();
    const rows = (await sql`
      update auth_tokens
      set used_at = ${now}
      where token_hash = ${tokenHash}
        and purpose    = ${purpose}
        and used_at is null
        and expires_at > ${now}
      returning email
    `) as unknown as { email: string }[];
    return rows[0]?.email ?? null;
  }

  // File mode is single-process dev, so a read-modify-write is adequate here.
  const tokens = await readTokens();
  const row = tokens.find(
    (t) =>
      t.tokenHash === tokenHash &&
      t.purpose === purpose &&
      t.usedAt == null &&
      t.expiresAt > now
  );
  if (!row) return null;
  row.usedAt = now;
  await writeTokens(tokens);
  return row.email;
}

/**
 * Invalidate every outstanding token of a purpose for an email.
 *
 * Called after a successful password reset. Without it, a reset link issued
 * earlier - possibly requested by an attacker, or sitting in an inbox the user
 * has since lost access to - would still work against the new password.
 */
export async function invalidateAuthTokens(
  email: string,
  purpose: TokenPurpose,
  now: number = Date.now()
): Promise<void> {
  const target = normalize(email);
  if (isDbEnabled()) {
    const sql = getSql();
    await sql`
      update auth_tokens set used_at = ${now}
      where email = ${target} and purpose = ${purpose} and used_at is null
    `;
    return;
  }
  const tokens = await readTokens();
  for (const t of tokens) {
    if (t.email === target && t.purpose === purpose && t.usedAt == null) {
      t.usedAt = now;
    }
  }
  await writeTokens(tokens);
}

/**
 * How many tokens of a purpose were issued for an email since `since`. Used to
 * throttle requests per ACCOUNT, which an IP-based limit cannot do: without it,
 * anyone can have us mail a victim a reset link repeatedly from any number of
 * addresses. Mailbox flooding is the abuse, and it is also how a real user's
 * inbox ends up marking us as spam.
 */
export async function countRecentTokens(
  email: string,
  purpose: TokenPurpose,
  since: number
): Promise<number> {
  const target = normalize(email);
  if (isDbEnabled()) {
    const sql = getSql();
    const rows = (await sql`
      select count(*)::int as n from auth_tokens
      where email = ${target} and purpose = ${purpose} and created_at >= ${since}
    `) as unknown as { n: number }[];
    return rows[0]?.n ?? 0;
  }
  const tokens = await readTokens();
  return tokens.filter(
    (t) => t.email === target && t.purpose === purpose && t.createdAt >= since
  ).length;
}

/**
 * Delete tokens that expired more than a day ago. Best-effort housekeeping,
 * called opportunistically so there is no scheduled job to operate.
 */
export async function pruneAuthTokens(now: number = Date.now()): Promise<void> {
  const cutoff = now - 24 * 60 * 60 * 1000;
  try {
    if (isDbEnabled()) {
      const sql = getSql();
      await sql`delete from auth_tokens where expires_at < ${cutoff}`;
      return;
    }
    const tokens = await readTokens();
    const kept = tokens.filter((t) => t.expiresAt >= cutoff);
    if (kept.length !== tokens.length) await writeTokens(kept);
  } catch (err) {
    console.error("[auth-tokens] prune failed", err);
  }
}
