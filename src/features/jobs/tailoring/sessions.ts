import { promises as fs } from "fs";
import path from "path";
import { getSql, isDbEnabled } from "@/services/database/db";

/**
 * Per-user tailoring-session store. Backed by a file (`.data/tailoring-sessions.json`,
 * gitignored) for local dev, and by Postgres when `DATABASE_URL` is set. Keyed by
 * the signed-in user's email so a tailoring session follows the account across
 * devices (the workflow may span payment redirects, share popups, and reloads).
 * The whole session is stored as one JSON snapshot. Server-only.
 */

/**
 * The persisted session shape the storage layer relies on. The full client
 * `TailoringSession` is structurally assignable to this (id/resumeId/jobId/
 * updatedAt plus more), so we do not import the client store into server code.
 */
export interface PersistedTailoringSession {
  id: string;
  resumeId: string;
  jobId: string;
  updatedAt: number;
  [key: string]: unknown;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "tailoring-sessions.json");

// email -> sessionId -> session
type AllSessions = Record<string, Record<string, PersistedTailoringSession>>;

// Email is the store key; normalize so case/whitespace variants resolve to one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/* --------------------------- file backend --------------------------- */

async function readAll(): Promise<AllSessions> {
  try {
    return JSON.parse(await fs.readFile(SESSIONS_FILE, "utf8")) as AllSessions;
  } catch {
    return {};
  }
}

async function writeAll(all: AllSessions): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(all, null, 2), "utf8");
}

async function fileGetSessions(
  email: string
): Promise<PersistedTailoringSession[]> {
  const all = await readAll();
  const byId = all[normalize(email)] ?? {};
  return Object.values(byId).sort((a, b) => b.updatedAt - a.updatedAt);
}

async function fileGetSession(
  email: string,
  id: string
): Promise<PersistedTailoringSession | null> {
  const all = await readAll();
  return all[normalize(email)]?.[id] ?? null;
}

async function fileUpsertSession(
  email: string,
  session: PersistedTailoringSession
): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key] ?? {};
  byId[session.id] = session;
  all[key] = byId;
  await writeAll(all);
}

async function fileRemoveSession(email: string, id: string): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key];
  if (!byId) return;
  delete byId[id];
  all[key] = byId;
  await writeAll(all);
}

/* -------------------------- postgres backend ------------------------- */

interface SessionRow {
  session: PersistedTailoringSession;
}

async function pgGetSessions(
  email: string
): Promise<PersistedTailoringSession[]> {
  const sql = getSql();
  const rows = (await sql`
    select session from tailoring_sessions
    where email = ${normalize(email)}
    order by updated_at desc
  `) as unknown as SessionRow[];
  return rows.map((r) => r.session);
}

async function pgGetSession(
  email: string,
  id: string
): Promise<PersistedTailoringSession | null> {
  const sql = getSql();
  const rows = (await sql`
    select session from tailoring_sessions
    where email = ${normalize(email)} and id = ${id}
    limit 1
  `) as unknown as SessionRow[];
  return rows[0]?.session ?? null;
}

async function pgUpsertSession(
  email: string,
  session: PersistedTailoringSession
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into tailoring_sessions (email, id, resume_id, job_id, session, updated_at)
    values (
      ${normalize(email)}, ${session.id}, ${session.resumeId}, ${session.jobId},
      ${JSON.stringify(session)}::jsonb, ${session.updatedAt}
    )
    on conflict (email, id) do update set
      resume_id = excluded.resume_id,
      job_id = excluded.job_id,
      session = excluded.session,
      updated_at = excluded.updated_at
  `;
}

async function pgRemoveSession(email: string, id: string): Promise<void> {
  const sql = getSql();
  await sql`
    delete from tailoring_sessions
    where email = ${normalize(email)} and id = ${id}
  `;
}

/* ---------------------------- public API ---------------------------- */

/** All of a user's tailoring sessions, newest first. */
export async function getTailoringSessions(
  email: string
): Promise<PersistedTailoringSession[]> {
  return isDbEnabled() ? pgGetSessions(email) : fileGetSessions(email);
}

/** One tailoring session by id, or null. */
export async function getTailoringSession(
  email: string,
  id: string
): Promise<PersistedTailoringSession | null> {
  return isDbEnabled() ? pgGetSession(email, id) : fileGetSession(email, id);
}

/** Insert or replace a user's tailoring session (by id). */
export async function upsertTailoringSession(
  email: string,
  session: PersistedTailoringSession
): Promise<void> {
  return isDbEnabled()
    ? pgUpsertSession(email, session)
    : fileUpsertSession(email, session);
}

/** Remove a user's tailoring session (by id). Idempotent. */
export async function removeTailoringSession(
  email: string,
  id: string
): Promise<void> {
  return isDbEnabled()
    ? pgRemoveSession(email, id)
    : fileRemoveSession(email, id);
}
