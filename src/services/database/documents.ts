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

/**
 * Decode a possibly multi-encoded JSON value down to its real object/array.
 *
 * A document's `data` is always an object, but legacy rows were written with
 * `${JSON.stringify(data)}::jsonb`, which double-encodes under postgres.js (it
 * JSON-encodes the string parameter again for the jsonb cast). Those rows store
 * a jsonb *string* and round-trip as a STRING instead of an object; spreading
 * that into the resume store yields character-indexed junk and a blank editor.
 * Some rows were even re-saved from a corrupted read and are double/triple
 * encoded, so a single parse isn't enough - loop until it's no longer a JSON
 * string. Genuine objects pass through untouched.
 */
function decodeJson(value: unknown): unknown {
  let v = value;
  for (let i = 0; i < 6 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      break; // not JSON (or fully decoded to a plain string) - keep as-is
    }
  }
  return v;
}

/** Merge a stored bucket with the canonical empty shape (tolerates old files). */
function withDefaults(docs: Partial<UserDocuments> | undefined): UserDocuments {
  return { ...emptyUserDocuments(), ...docs };
}

/* ----------------------- concurrency control ------------------------ */

/**
 * Optional write options. `baseUpdatedAt` is the `updatedAt` the client had when
 * it LOADED the document - i.e. the version its edit is based on. Supplying it
 * turns the write into a compare-and-swap.
 */
export interface UpsertOptions {
  /** The stored `updatedAt` this edit was derived from, for a CAS write. */
  baseUpdatedAt?: number;
}

/** Outcome of a write. A stale write is refused, never silently applied. */
export type UpsertResult =
  | { ok: true }
  | { ok: false; reason: "stale"; storedUpdatedAt: number };

/**
 * Decide whether a write may land, given the currently stored version.
 *
 * Two modes, because the two real failure shapes need different guards:
 *
 * 1. `base` SUPPLIED - compare-and-swap. The write lands only if the stored
 *    version is still the one the editor loaded. This is the mode that fixes
 *    the two-tab data loss: tab B's save carries a NEWER timestamp but was
 *    composed from a document that predates tab A's edit, so a timestamp
 *    comparison alone happily accepts it and A's work disappears. Comparing
 *    against the BASE catches it, because B's base is no longer current.
 *
 * 2. `base` ABSENT - monotonic guard, for older clients and server-side
 *    callers that do not track a base. It cannot catch the two-tab case (B's
 *    timestamp really is newer), but it does reject genuinely out-of-order
 *    writes: a delayed retry, a replayed request, or a client with a slow
 *    clock overwriting newer data. `>=` rather than `>` so an idempotent retry
 *    carrying the same timestamp still succeeds.
 */
function writeAllowed(
  stored: number,
  incoming: number,
  base: number | undefined
): boolean {
  if (base !== undefined) return stored === base;
  return incoming >= stored;
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
  record: StoredDocument,
  opts?: UpsertOptions
): Promise<UpsertResult> {
  const all = await readAll();
  const key = normalize(email);
  const docs = withDefaults(all[key]);
  const list = docs[type];
  const i = list.findIndex((r) => r.id === record.id);

  if (i >= 0) {
    const stored = list[i].updatedAt;
    if (!writeAllowed(stored, record.updatedAt, opts?.baseUpdatedAt)) {
      return { ok: false, reason: "stale", storedUpdatedAt: stored };
    }
    list[i] = record;
  } else {
    list.unshift(record);
  }

  all[key] = docs;
  await writeAll(all);
  return { ok: true };
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
      data: decodeJson(r.data),
    });
  }
  return docs;
}

async function pgUpsertDocument(
  email: string,
  type: DocType,
  record: StoredDocument,
  opts?: UpsertOptions
): Promise<UpsertResult> {
  const sql = getSql();
  // Store `data` as a proper jsonb OBJECT via postgres.js's `sql.json` helper.
  // `${JSON.stringify(data)}::jsonb` double-encodes here (postgres.js re-encodes
  // the string param for the jsonb cast), producing a jsonb string that blanks
  // the editor on read. `decodeJson` also normalizes any legacy string that
  // arrives from a corrupted round-trip back into an object before storing.
  const data = decodeJson(record.data);
  // The conflict guard decides whether an UPDATE is permitted; see
  // writeAllowed() for why the two modes differ. A fresh INSERT never conflicts,
  // so a brand-new document is unaffected by either guard.
  const base = opts?.baseUpdatedAt;
  const guard =
    base !== undefined
      ? sql`documents.updated_at = ${base}`
      : sql`excluded.updated_at >= documents.updated_at`;

  const res = await sql`
    insert into documents (email, type, id, title, template_id, data, updated_at)
    values (
      ${normalize(email)}, ${type}, ${record.id}, ${record.title},
      ${record.templateId ?? null}, ${sql.json(data as never)},
      ${record.updatedAt}
    )
    on conflict (email, type, id) do update set
      title = excluded.title,
      template_id = excluded.template_id,
      data = excluded.data,
      updated_at = excluded.updated_at
    where ${guard}
  `;

  // Zero rows affected means the ON CONFLICT guard rejected the update, i.e.
  // the stored version moved on. Report it instead of pretending it saved -
  // silently returning ok here is exactly the bug this change removes.
  if (res.count === 0) {
    const [row] = (await sql`
      select updated_at from documents
      where email = ${normalize(email)} and type = ${type} and id = ${record.id}
    `) as unknown as { updated_at: string | number }[];
    return {
      ok: false,
      reason: "stale",
      storedUpdatedAt: row ? Number(row.updated_at) : 0,
    };
  }
  return { ok: true };
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

/**
 * Insert or replace one document (by id) for a user.
 *
 * Pass `opts.baseUpdatedAt` (the version the editor loaded) to get a
 * compare-and-swap write that refuses to clobber a concurrent edit. Callers
 * that ignore the return value keep the previous behaviour for new documents
 * and in-order writes; only a genuinely conflicting write now comes back
 * `{ ok: false }` instead of silently overwriting.
 */
export async function upsertDocument(
  email: string,
  type: DocType,
  record: StoredDocument,
  opts?: UpsertOptions
): Promise<UpsertResult> {
  return isDbEnabled()
    ? pgUpsertDocument(email, type, record, opts)
    : fileUpsertDocument(email, type, record, opts);
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
