import { promises as fs } from "fs";
import path from "path";
import { getSql, isDbEnabled } from "@/services/database/db";
import type { JobPosting } from "./job-search";

/**
 * Per-user saved-jobs store. Backed by a file (`.data/saved-jobs.json`,
 * gitignored) for zero-setup local dev, and by Postgres when `DATABASE_URL` is
 * set (required on serverless hosts). Keyed by the signed-in user's email so a
 * user's saved postings follow their account across devices. Every exported
 * function keeps the same signature regardless of backend, so `/api/jobs/saved`
 * is unaffected. Server-only.
 */

/** One saved posting plus when it was saved (for newest-first ordering). */
export interface SavedJob {
  job: JobPosting;
  savedAt: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SAVED_FILE = path.join(DATA_DIR, "saved-jobs.json");

// email -> jobId -> SavedJob
type AllSaved = Record<string, Record<string, SavedJob>>;

// Email is the store key; normalize so case/whitespace variants resolve to one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/* --------------------------- file backend --------------------------- */

async function readAll(): Promise<AllSaved> {
  try {
    return JSON.parse(await fs.readFile(SAVED_FILE, "utf8")) as AllSaved;
  } catch {
    return {};
  }
}

async function writeAll(all: AllSaved): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SAVED_FILE, JSON.stringify(all, null, 2), "utf8");
}

async function fileGetSavedJobs(email: string): Promise<SavedJob[]> {
  const all = await readAll();
  const byId = all[normalize(email)] ?? {};
  return Object.values(byId).sort((a, b) => b.savedAt - a.savedAt);
}

async function fileAddSavedJob(
  email: string,
  job: JobPosting,
  savedAt: number
): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key] ?? {};
  byId[job.id] = { job, savedAt };
  all[key] = byId;
  await writeAll(all);
}

async function fileRemoveSavedJob(email: string, jobId: string): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const byId = all[key];
  if (!byId) return;
  delete byId[jobId];
  all[key] = byId;
  await writeAll(all);
}

/* -------------------------- postgres backend ------------------------- */

interface SavedRow {
  job: JobPosting;
  saved_at: string | number; // bigint comes back as a string from pg
}

async function pgGetSavedJobs(email: string): Promise<SavedJob[]> {
  const sql = getSql();
  const rows = (await sql`
    select job, saved_at
    from saved_jobs where email = ${normalize(email)}
    order by saved_at desc
  `) as unknown as SavedRow[];
  return rows.map((r) => ({ job: r.job, savedAt: Number(r.saved_at) }));
}

async function pgAddSavedJob(
  email: string,
  job: JobPosting,
  savedAt: number
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into saved_jobs (email, job_id, job, saved_at)
    values (${normalize(email)}, ${job.id}, ${JSON.stringify(job)}::jsonb, ${savedAt})
    on conflict (email, job_id) do update set
      job = excluded.job,
      saved_at = excluded.saved_at
  `;
}

async function pgRemoveSavedJob(email: string, jobId: string): Promise<void> {
  const sql = getSql();
  await sql`
    delete from saved_jobs
    where email = ${normalize(email)} and job_id = ${jobId}
  `;
}

/* ---------------------------- public API ---------------------------- */

/** A user's saved postings, newest first. */
export async function getSavedJobs(email: string): Promise<SavedJob[]> {
  return isDbEnabled() ? pgGetSavedJobs(email) : fileGetSavedJobs(email);
}

/** Save one posting for a user (upsert by job id). */
export async function addSavedJob(
  email: string,
  job: JobPosting,
  savedAt: number
): Promise<void> {
  return isDbEnabled()
    ? pgAddSavedJob(email, job, savedAt)
    : fileAddSavedJob(email, job, savedAt);
}

/** Remove one saved posting for a user (by job id). Idempotent. */
export async function removeSavedJob(
  email: string,
  jobId: string
): Promise<void> {
  return isDbEnabled()
    ? pgRemoveSavedJob(email, jobId)
    : fileRemoveSavedJob(email, jobId);
}
