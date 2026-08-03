import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getSql, isDbEnabled } from "./db";

/**
 * User store for email + password auth. Backed by a file (`.data/users.json`,
 * gitignored) for zero-setup local dev, and by Postgres when `DATABASE_URL` is
 * set (required on serverless hosts). Every exported function keeps the same
 * signature regardless of backend, so `auth.ts` and the routes are unaffected.
 * Server-only.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

/** A user as persisted - includes the bcrypt password hash. */
interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

/** A user safe to expose to the client - no password hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

// Email is the unique key; normalize so case/whitespace variants match one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Default display name derived from the email local-part. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/* --------------------------- file backend --------------------------- */

/** Read all users from the file; returns [] if the file is missing. */
async function readUsers(): Promise<StoredUser[]> {
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
}

/** Persist all users (creating the .data dir if needed). */
async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function fileFindUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await readUsers();
  const target = normalize(email);
  return users.find((u) => u.email === target);
}

async function fileCreateUser(
  email: string,
  password: string,
  name?: string
): Promise<PublicUser> {
  const users = await readUsers();
  const target = normalize(email);
  if (users.some((u) => u.email === target)) {
    throw new Error("exists");
  }
  const user: StoredUser = {
    id: randomUUID(),
    email: target,
    name: name?.trim() || nameFromEmail(target),
    passwordHash: await bcrypt.hash(password, 10),
  };
  users.push(user);
  await writeUsers(users);
  return { id: user.id, email: user.email, name: user.name };
}

async function fileUpdateUserName(email: string, name: string): Promise<boolean> {
  const users = await readUsers();
  const target = normalize(email);
  const user = users.find((u) => u.email === target);
  if (!user) return false;
  const next = name.trim();
  if (next) user.name = next;
  await writeUsers(users);
  return true;
}

async function fileDeleteUser(email: string): Promise<void> {
  const users = await readUsers();
  const target = normalize(email);
  await writeUsers(users.filter((u) => u.email !== target));
}

/* -------------------------- postgres backend ------------------------- */

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

function rowToUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
  };
}

/** True if the error is a Postgres unique-violation (duplicate key). */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

async function pgFindUserByEmail(email: string): Promise<StoredUser | undefined> {
  const sql = getSql();
  const rows = (await sql`
    select id, email, name, password_hash
    from users where email = ${normalize(email)} limit 1
  `) as unknown as UserRow[];
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

async function pgCreateUser(
  email: string,
  password: string,
  name?: string
): Promise<PublicUser> {
  const target = normalize(email);
  if (await pgFindUserByEmail(target)) throw new Error("exists");
  const user: StoredUser = {
    id: randomUUID(),
    email: target,
    name: name?.trim() || nameFromEmail(target),
    passwordHash: await bcrypt.hash(password, 10),
  };
  const sql = getSql();
  try {
    await sql`
      insert into users (id, email, name, password_hash)
      values (${user.id}, ${user.email}, ${user.name}, ${user.passwordHash})
    `;
  } catch (err) {
    // Lost a race between the check above and the insert.
    if (isUniqueViolation(err)) throw new Error("exists");
    throw err;
  }
  return { id: user.id, email: user.email, name: user.name };
}

async function pgUpdateUserName(email: string, name: string): Promise<boolean> {
  const sql = getSql();
  const target = normalize(email);
  const next = name.trim();
  if (next) {
    const rows = (await sql`
      update users set name = ${next} where email = ${target} returning id
    `) as unknown as { id: string }[];
    return rows.length > 0;
  }
  const rows = (await sql`
    select id from users where email = ${target} limit 1
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

async function pgDeleteUser(email: string): Promise<void> {
  const sql = getSql();
  // documents are removed by the ON DELETE CASCADE on documents.email.
  await sql`delete from users where email = ${normalize(email)}`;
}

/* ---------------------------- public API ---------------------------- */

/** Find a user by email (case-insensitive), or undefined if none. */
export async function findUserByEmail(
  email: string
): Promise<StoredUser | undefined> {
  return isDbEnabled() ? pgFindUserByEmail(email) : fileFindUserByEmail(email);
}

/** Create a user. Throws "exists" if the email is already registered. */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<PublicUser> {
  return isDbEnabled()
    ? pgCreateUser(email, password, name)
    : fileCreateUser(email, password, name);
}

/**
 * Update a user's display name. Returns false for accounts that don't live in
 * the store - e.g. Google-only sign-ins, whose name comes from the OAuth
 * profile / session instead.
 */
export async function updateUserName(
  email: string,
  name: string
): Promise<boolean> {
  return isDbEnabled()
    ? pgUpdateUserName(email, name)
    : fileUpdateUserName(email, name);
}

/** Permanently remove a user from the store (idempotent). */
export async function deleteUser(email: string): Promise<void> {
  return isDbEnabled() ? pgDeleteUser(email) : fileDeleteUser(email);
}

/** Return the user if email + password match, otherwise null. */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<PublicUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? { id: user.id, email: user.email, name: user.name } : null;
}
