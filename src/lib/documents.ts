import { promises as fs } from "fs";
import path from "path";
import { getSql, isDbEnabled } from "./db";

/**
 * Per-user document store. Backed by a file (`.data/documents.json`, gitignored)
 * for zero-setup local dev, and by Postgres when `DATABASE_URL` is set (required
 * on serverless hosts). Keyed by the signed-in user's email so a user's resumes
 * / cover letters / resignation letters follow their account across devices.
 * Every exported function keeps the same signature regardless of backend, so
 * `/api/documents` is unaffected. Server-only.
 */

/** The kinds of documents a user can store. */
export type DocType =
  | "resumes"
  | "coverLetters"
  | "resignationLetters"
  | "interviewPrep";

/** All valid document types, for iteration and runtime validation. */
export const DOC_TYPES: DocType[] = [
  "resumes",
  "coverLetters",
  "resignationLetters",
  "interviewPrep",
];

/** Type guard: narrows an unknown value to a valid DocType. */
export function isDocType(t: unknown): t is DocType {
  return typeof t === "string" && (DOC_TYPES as string[]).includes(t);
}

/** A stored document - kept intentionally generic; the client owns the shape. */
export interface StoredDocument {
  id: string;
  title: string;
  updatedAt: number;
  templateId?: string;
  data: unknown;
}

/** One user's documents, bucketed by type. */
export type UserDocuments = Record<DocType, StoredDocument[]>;

const DATA_DIR = path.join(process.cwd(), ".data");
const DOCS_FILE = path.join(DATA_DIR, "documents.json");

type AllDocuments = Record<string, UserDocuments>;

/** A fresh, empty bucket set for a user. */
function emptyUserDocuments(): UserDocuments {
  return {
    resumes: [],
    coverLetters: [],
    resignationLetters: [],
    interviewPrep: [],
  };
}

// Email is the store key; normalize so case/whitespace variants resolve to one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Merge a stored bucket with the canonical empty shape (tolerates old files). */
function withDefaults(docs: Partial<UserDocuments> | undefined): UserDocuments {
  return { ...emptyUserDocuments(), ...docs };
}

/* --------------------------- file backend --------------------------- */

/** Read the whole documents file; returns {} if it doesn't exist yet. */
async function readAll(): Promise<AllDocuments> {
  try {
    return JSON.parse(await fs.readFile(DOCS_FILE, "utf8")) as AllDocuments;
  } catch {
    return {};
  }
}

/** Persist the whole documents file (creating the .data dir if needed). */
async function writeAll(all: AllDocuments): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DOCS_FILE, JSON.stringify(all, null, 2), "utf8");
}

async function fileGetUserDocuments(email: string): Promise<UserDocuments> {
  const all = await readAll();
  return withDefaults(all[normalize(email)]);
}

async function fileUpsertDocument(
  email: string,
  type: DocType,
  record: StoredDocument
): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const docs = withDefaults(all[key]);
  const list = docs[type];
  const i = list.findIndex((r) => r.id === record.id);
  if (i >= 0) list[i] = record;
  else list.unshift(record);
  all[key] = docs;
  await writeAll(all);
}

async function fileRemoveDocument(
  email: string,
  type: DocType,
  id: string
): Promise<void> {
  const all = await readAll();
  const key = normalize(email);
  const docs = all[key];
  if (!docs) return;
  all[key] = withDefaults(docs);
  all[key][type] = all[key][type].filter((r) => r.id !== id);
  await writeAll(all);
}

/* -------------------------- postgres backend ------------------------- */

interface DocRow {
  id: string;
  type: string;
  title: string;
  template_id: string | null;
  data: unknown;
  updated_at: string | number; // bigint comes back as a string from pg
}

async function pgGetUserDocuments(email: string): Promise<UserDocuments> {
  const sql = getSql();
  const rows = (await sql`
    select id, type, title, template_id, data, updated_at
    from documents where email = ${normalize(email)}
    order by updated_at desc
  `) as unknown as DocRow[];
  const docs = emptyUserDocuments();
  for (const r of rows) {
    if (!isDocType(r.type)) continue;
    docs[r.type].push({
      id: r.id,
      title: r.title,
      updatedAt: Number(r.updated_at),
      templateId: r.template_id ?? undefined,
      data: r.data,
    });
  }
  return docs;
}

async function pgUpsertDocument(
  email: string,
  type: DocType,
  record: StoredDocument
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into documents (email, type, id, title, template_id, data, updated_at)
    values (
      ${normalize(email)}, ${type}, ${record.id}, ${record.title},
      ${record.templateId ?? null}, ${JSON.stringify(record.data)}::jsonb,
      ${record.updatedAt}
    )
    on conflict (email, type, id) do update set
      title = excluded.title,
      template_id = excluded.template_id,
      data = excluded.data,
      updated_at = excluded.updated_at
  `;
}

async function pgRemoveDocument(
  email: string,
  type: DocType,
  id: string
): Promise<void> {
  const sql = getSql();
  await sql`
    delete from documents
    where email = ${normalize(email)} and type = ${type} and id = ${id}
  `;
}

/* ---------------------------- public API ---------------------------- */

/** All of a user's documents, grouped by type. */
export async function getUserDocuments(email: string): Promise<UserDocuments> {
  return isDbEnabled()
    ? pgGetUserDocuments(email)
    : fileGetUserDocuments(email);
}

/** Insert or replace one document (by id) for a user. */
export async function upsertDocument(
  email: string,
  type: DocType,
  record: StoredDocument
): Promise<void> {
  return isDbEnabled()
    ? pgUpsertDocument(email, type, record)
    : fileUpsertDocument(email, type, record);
}

/** Remove one document (by id) for a user. Idempotent. */
export async function removeDocument(
  email: string,
  type: DocType,
  id: string
): Promise<void> {
  return isDbEnabled()
    ? pgRemoveDocument(email, type, id)
    : fileRemoveDocument(email, type, id);
}
