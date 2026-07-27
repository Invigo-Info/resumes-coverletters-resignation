// One-shot import of the file store (.data/*.json) into Postgres.
// Run AFTER `node scripts/db-setup.mjs`.  Usage:  node scripts/import-json-to-db.mjs
// Idempotent: re-running upserts the same rows, it does not duplicate them.
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

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: "require" });
const DOC_TYPES = ["resumes", "coverLetters", "resignationLetters"];
const norm = (e) => String(e).trim().toLowerCase();

// Users first (documents reference users.email via a foreign key).
const users = readJson(".data/users.json", []);
let userCount = 0;
for (const u of users) {
  if (!u?.email) continue;
  await sql`
    insert into users (id, email, name, password_hash)
    values (${u.id}, ${norm(u.email)}, ${u.name ?? ""}, ${u.passwordHash ?? ""})
    on conflict (email) do update set
      name = excluded.name, password_hash = excluded.password_hash
  `;
  userCount++;
}

// Then documents, bucketed by type per user.
const allDocs = readJson(".data/documents.json", {});
let docCount = 0;
for (const [email, buckets] of Object.entries(allDocs)) {
  for (const type of DOC_TYPES) {
    const list = Array.isArray(buckets?.[type]) ? buckets[type] : [];
    for (const d of list) {
      if (!d?.id) continue;
      await sql`
        insert into documents (email, type, id, title, template_id, data, updated_at)
        values (
          ${norm(email)}, ${type}, ${d.id}, ${d.title ?? "Untitled"},
          ${d.templateId ?? null}, ${JSON.stringify(d.data ?? null)}::jsonb,
          ${Number(d.updatedAt) || Date.now()}
        )
        on conflict (email, type, id) do update set
          title = excluded.title, template_id = excluded.template_id,
          data = excluded.data, updated_at = excluded.updated_at
      `;
      docCount++;
    }
  }
}

console.log(`Imported ${userCount} user(s) and ${docCount} document(s).`);
await sql.end();
