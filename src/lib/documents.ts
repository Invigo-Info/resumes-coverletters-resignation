import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal file-backed, per-user document store (no database in this project).
 * Mirrors `users.ts`: documents live in `.data/documents.json` (gitignored),
 * keyed by the signed-in user's email. Server-only — used by /api/documents so a
 * user's resumes / cover letters / resignation letters follow their account
 * across browsers and devices, instead of living only in one browser's
 * localStorage.
 */

/** The three kinds of documents a user can store. */
export type DocType = "resumes" | "coverLetters" | "resignationLetters";

/** All valid document types, for iteration and runtime validation. */
export const DOC_TYPES: DocType[] = [
  "resumes",
  "coverLetters",
  "resignationLetters",
];

/** Type guard: narrows an unknown value to a valid DocType. */
export function isDocType(t: unknown): t is DocType {
  return typeof t === "string" && (DOC_TYPES as string[]).includes(t);
}

/** A stored document — kept intentionally generic; the client owns the shape. */
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
  return { resumes: [], coverLetters: [], resignationLetters: [] };
}

// Email is the store key; normalize so case/whitespace variants resolve to one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

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

/** Merge a stored bucket with the canonical empty shape (tolerates old files). */
function withDefaults(docs: Partial<UserDocuments> | undefined): UserDocuments {
  return { ...emptyUserDocuments(), ...docs };
}

/** All of a user's documents, grouped by type. */
export async function getUserDocuments(email: string): Promise<UserDocuments> {
  const all = await readAll();
  return withDefaults(all[normalize(email)]);
}

/** Insert or replace one document (by id) for a user. */
export async function upsertDocument(
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

/** Remove one document (by id) for a user. Idempotent. */
export async function removeDocument(
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
