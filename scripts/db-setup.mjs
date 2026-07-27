// Apply database/schema.sql to the Postgres pointed at by DATABASE_URL.
// Usage:  node scripts/db-setup.mjs
// Reads DATABASE_URL from the environment or from .env.local / .env.
import { readFileSync, existsSync } from "node:fs";
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
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const raw = readFileSync("database/schema.sql", "utf8");
// Strip comment-only lines, then split into individual statements (the HTTP
// driver runs one statement per call). The schema has no semicolons inside
// statements, so a plain split on ';' is safe here.
const statements = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(url, { prepare: false, ssl: "require" });
try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("ok:", stmt.split("\n")[0].slice(0, 60));
  }
  console.log(`\nApplied ${statements.length} statement(s). Schema ready.`);
} finally {
  await sql.end();
}
