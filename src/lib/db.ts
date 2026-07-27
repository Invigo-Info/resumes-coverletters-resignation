import postgres from "postgres";

/**
 * Postgres access for the account-level stores (users + documents).
 *
 * The app ships with a file-backed store (see `users.ts` / `documents.ts`) so it
 * runs with zero setup locally. When `DATABASE_URL` is set (Supabase Postgres),
 * those modules transparently switch to this SQL backend instead - required for
 * serverless hosting, where the filesystem is read-only.
 *
 * The client is created lazily so importing this module never throws when
 * `DATABASE_URL` is absent (file-store mode).
 */

/** True when a database is configured; drives the file-store <-> Postgres switch. */
export function isDbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let client: ReturnType<typeof postgres> | null = null;

/** The postgres.js tagged-template client. Throws if `DATABASE_URL` is not set. */
export function getSql(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!client) {
    // Use Supabase's pooled/transaction connection string (Supavisor, port 6543)
    // on serverless. `prepare: false` is REQUIRED there: the transaction pooler
    // does not support prepared statements, which postgres.js uses by default.
    // `ssl: "require"` matches Supabase's TLS-only connections.
    client = postgres(url, { prepare: false, ssl: "require" });
  }
  return client;
}
