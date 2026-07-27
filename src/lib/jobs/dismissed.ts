import { promises as fs } from "fs";
import path from "path";
import { getSql, isDbEnabled } from "@/lib/db";

/**
 * Per-user dismissed ("Not interested") jobs. Backed by a file
 * (`.data/dismissed-jobs.json`, gitignored) for local dev, and by Postgres when
 * `DATABASE_URL` is set. Keyed by the signed-in user's email so the hidden list +
 * reason follow their account across devices. The companion to `saved.ts`.
 * Server-only.
 */

/** One dismissed posting: the job id and why it was hidden (if given). */
export interface DismissedJob {
  jobId: string;
  reason: string | null;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DISMISSED_FILE = path.join(DATA_DIR, "dismissed-jobs.json");

interface DismissedRecord {
  reason: string | null;
  dismissedAt: number;
}
// email -> jobId -> record
type AllDismissed = Record<string, Record<string, DismissedRecord>>;

// Email is the store key; normalize so case/whitespace variants resolve to one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/* --------------------------- file backend --------------------------- */

async function readAll(): Promise<AllDismissed> {
  try {
    return JSON.parse(await fs.readFile(DISMISSED_FILE, "utf8")) as AllDismissed;
  } catch {
    return {};
  }
}

async function writeAll(all: AllDismissed): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DISMISSED_FILE, JSON.stringify(all, null, 2), "utf8");
}

async function fileGet(email: string): Promise<DismissedJob[]> {
  const all = await readAll();
  const byId = all[normalize(email)] ?? {};
  return Object.entries(byId).map(([jobId, r]) => ({
    jobId,
    reason: r.reason,
  }));
}

async function fileAdd(
  email: string,
  jobId: string,
  reason: string | null,
  at: number
): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key] ?? {};
  byId[jobId] = { reason, dismissedAt: at };
  all[key] = byId;
  await writeAll(all);
}

async function fileRemove(email: string, jobId: string): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key];
  if (!byId) return;
  delete byId[jobId];
  all[key] = byId;
  await writeAll(all);
}

async function fileClear(email: string): Promise<void> {
  const all = await readAll();
  delete all[normalize(email)];
  await writeAll(all);
}

/* -------------------------- postgres backend ------------------------- */

interface DismissedRow {
  job_id: string;
  reason: string | null;
}

async function pgGet(email: string): Promise<DismissedJob[]> {
  const sql = getSql();
  const rows = (await sql`
    select job_id, reason from dismissed_jobs where email = ${normalize(email)}
  `) as unknown as DismissedRow[];
  return rows.map((r) => ({ jobId: r.job_id, reason: r.reason }));
}

async function pgAdd(
  email: string,
  jobId: string,
  reason: string | null,
  at: number
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into dismissed_jobs (email, job_id, reason, dismissed_at)
    values (${normalize(email)}, ${jobId}, ${reason}, ${at})
    on conflict (email, job_id) do update set
      reason = excluded.reason,
      dismissed_at = excluded.dismissed_at
  `;
}

async function pgRemove(email: string, jobId: string): Promise<void> {
  const sql = getSql();
  await sql`
    delete from dismissed_jobs
    where email = ${normalize(email)} and job_id = ${jobId}
  `;
}

async function pgClear(email: string): Promise<void> {
  const sql = getSql();
  await sql`delete from dismissed_jobs where email = ${normalize(email)}`;
}

/* ---------------------------- public API ---------------------------- */

/** A user's dismissed jobs. */
export async function getDismissedJobs(email: string): Promise<DismissedJob[]> {
  return isDbEnabled() ? pgGet(email) : fileGet(email);
}

/** Dismiss one posting for a user (upsert by job id). */
export async function addDismissedJob(
  email: string,
  jobId: string,
  reason: string | null,
  at: number
): Promise<void> {
  return isDbEnabled()
    ? pgAdd(email, jobId, reason, at)
    : fileAdd(email, jobId, reason, at);
}

/** Un-dismiss one posting for a user (by job id). Idempotent. */
export async function removeDismissedJob(
  email: string,
  jobId: string
): Promise<void> {
  return isDbEnabled() ? pgRemove(email, jobId) : fileRemove(email, jobId);
}

/** Clear all of a user's dismissed jobs. */
export async function clearDismissedJobs(email: string): Promise<void> {
  return isDbEnabled() ? pgClear(email) : fileClear(email);
}
