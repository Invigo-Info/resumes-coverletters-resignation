// Apply pending database migrations to the Postgres pointed at by DATABASE_URL.
//
//   node scripts/db-migrate.mjs            apply everything pending
//   node scripts/db-migrate.mjs --status   list applied / pending, change nothing
//   node scripts/db-migrate.mjs --verify   re-run the post-migration checks only
//
// Reads DATABASE_URL from the environment, or from .env.local / .env.
//
// How it works. A `schema_migrations` table records every migration that has
// run, so applying twice is a no-op and a half-finished deploy can be resumed.
// The baseline is `database/schema.sql` itself - it is fully idempotent (every
// statement is `if not exists` or a guarded alter), so it is recorded as
// `0000_baseline` and never duplicated into a migration file. That keeps ONE
// source of truth for the base schema. Numbered files in database/migrations/
// are then applied in filename order.
//
// Each file runs through the simple query protocol, which wraps a multi-statement
// file in a single implicit transaction - so a migration either lands whole or
// not at all - and, unlike splitting on ';', it does not mangle dollar-quoted
// DO blocks.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Supabase: Project Settings -> Database -> Connection string -> URI,\n" +
      "using the POOLED (Supavisor, port 6543) string. Put it in .env.local."
  );
  process.exit(1);
}

const MIGRATIONS_DIR = "database/migrations";
const BASELINE = "0000_baseline";
const args = new Set(process.argv.slice(2));
const statusOnly = args.has("--status");
const verifyOnly = args.has("--verify");

/** Numbered .sql files, in filename order. */
function migrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const sql = postgres(url, { prepare: false, ssl: "require" });

/**
 * Report any table in `public` that is readable through Supabase's REST API.
 * On Supabase this is the check that matters: a public table without RLS is
 * exposed to anyone holding the publishable anon key. Returns the offenders.
 */
async function verify() {
  const unprotected = await sql`
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = false
    order by c.relname
  `;

  if (unprotected.length === 0) {
    console.log("\nverify: every table in `public` has row level security on.");
    return [];
  }

  console.warn(
    `\nverify: ${unprotected.length} table(s) in \`public\` have NO row level security:`
  );
  for (const row of unprotected) console.warn("   -", row.table_name);
  console.warn(
    "On Supabase these are reachable through the project's REST API with the\n" +
      "publishable anon key. Enable RLS on each one:\n" +
      "   alter table public.<name> enable row level security;"
  );
  return unprotected.map((r) => r.table_name);
}

/** Turn a driver-level failure into something actionable. */
function explain(err) {
  const msg = String(err?.message ?? err);
  if (/tenant.*not found|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return (
      "Could not reach the database.\n" +
      "`tenant/user not found` from Supavisor means the project reference in\n" +
      "DATABASE_URL does not resolve - usually a deleted or paused Supabase\n" +
      "project, or a stale connection string. Re-copy it from Project Settings\n" +
      "-> Database -> Connection string -> URI (pooled, port 6543)."
    );
  }
  if (/password authentication failed/i.test(msg)) {
    return "The database password in DATABASE_URL is wrong. Re-copy the pooled URI, or reset the password in Supabase.";
  }
  if (/ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
    return "The database refused or timed out the connection. Check the host and port (pooled Supabase is 6543) and that the project is running.";
  }
  return msg;
}

try {
  await sql`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql`select name from schema_migrations`).map((r) => r.name)
  );

  const pending = [];
  if (!applied.has(BASELINE)) pending.push(BASELINE);
  for (const f of migrationFiles()) {
    if (!applied.has(f)) pending.push(f);
  }

  if (statusOnly || verifyOnly) {
    console.log(`applied (${applied.size}):`);
    for (const name of [...applied].sort()) console.log("   ok  ", name);
    console.log(`pending (${pending.length}):`);
    for (const name of pending) console.log("   --  ", name);
    if (verifyOnly) await verify();
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log("Nothing to apply - the database is up to date.");
    await verify();
    process.exit(0);
  }

  for (const name of pending) {
    const file =
      name === BASELINE
        ? "database/schema.sql"
        : path.join(MIGRATIONS_DIR, name);
    const body = readFileSync(file, "utf8");

    process.stdout.write(`applying ${name} ... `);
    // .simple() runs the whole file as one simple query: a single implicit
    // transaction, and dollar-quoted blocks survive intact.
    await sql.unsafe(body).simple();
    await sql`insert into schema_migrations (name) values (${name})`;
    console.log("ok");
  }

  console.log(`\nApplied ${pending.length} migration(s).`);
  const offenders = await verify();
  // A public table with no RLS on Supabase is a data-exposure bug, so fail the
  // command rather than letting a deploy script treat it as success.
  if (offenders.length > 0) process.exitCode = 1;
} catch (err) {
  // A connection failure is the common case here and a raw driver stack trace
  // tells the reader nothing useful.
  console.error("\n" + explain(err));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
