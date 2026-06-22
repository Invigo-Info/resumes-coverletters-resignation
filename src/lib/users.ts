import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Minimal file-backed user store for email + password auth (no database in this
 * project). Users live in `.data/users.json` (gitignored). Server-only — used
 * by the Auth.js Credentials provider and the /api/register route.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

/** A user as persisted on disk — includes the bcrypt password hash. */
interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

/** A user safe to expose to the client — no password hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

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

// Email is the unique key; normalize so case/whitespace variants match one user.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Default display name derived from the email local-part. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Find a user by email (case-insensitive), or undefined if none. */
export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await readUsers();
  const target = normalize(email);
  return users.find((u) => u.email === target);
}

/** Create a user. Throws "exists" if the email is already registered. */
export async function createUser(
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

/**
 * Update a user's display name. No-op (returns false) for accounts that don't
 * live in the file store — e.g. Google-only sign-ins, whose name comes from the
 * OAuth profile / session instead.
 */
export async function updateUserName(email: string, name: string): Promise<boolean> {
  const users = await readUsers();
  const target = normalize(email);
  const user = users.find((u) => u.email === target);
  if (!user) return false;
  const next = name.trim();
  if (next) user.name = next;
  await writeUsers(users);
  return true;
}

/** Permanently remove a user from the file store (idempotent). */
export async function deleteUser(email: string): Promise<void> {
  const users = await readUsers();
  const target = normalize(email);
  await writeUsers(users.filter((u) => u.email !== target));
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
