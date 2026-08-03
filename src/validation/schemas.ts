import { z } from "zod";

/**
 * Runtime validation schemas for API request bodies. A TypeScript `as` cast is
 * erased at runtime, so it does not stop a bypassed frontend, a fuzzer, or a
 * direct curl from sending malformed input. These schemas are the real gate at
 * the trust boundary; parse the body and reject on failure before any work.
 */

/** Every AI task the `/api/ai` route supports. Single source of truth. */
export const AI_TASKS = [
  "summary",
  "improveSummary",
  "bullets",
  "improveBullets",
  "skills",
  "tailor",
  "suggest",
  "coverLetter",
  "parseResume",
  "extractResume",
  "extractJobPosting",
  "rewriteBullets",
  "rankChips",
  "resignationLetter",
  "improveText",
  "scoreJob",
  "interviewPrep",
] as const;

/** A valid AI task name. */
export const aiTaskSchema = z.enum(AI_TASKS);

/** The task type, derived from the schema so the two never drift apart. */
export type Task = z.infer<typeof aiTaskSchema>;

/**
 * `/api/ai` request body. `payload` stays an open record because each task reads
 * its own fields (and an optional inline file); the route validates the task and
 * re-checks the decoded file size separately.
 */
export const aiBodySchema = z.object({
  task: aiTaskSchema,
  payload: z.record(z.string(), z.unknown()),
});

export type AiBody = z.infer<typeof aiBodySchema>;

/**
 * A saved job posting. The client owns the full `JobPosting` shape; here we only
 * assert the fields the server relies on (a non-empty id to key the row, plus a
 * couple of display fields) and keep the rest via `looseObject`, so the whole
 * posting is stored as-is without coupling this schema to every JobPosting field.
 */
export const savedJobSchema = z.looseObject({
  id: z.string().min(1),
  title: z.string(),
  company: z.string(),
});

/** `/api/jobs/saved` POST body: the posting to save. */
export const savedJobBodySchema = z.object({ job: savedJobSchema });

export type SavedJobBody = z.infer<typeof savedJobBodySchema>;

/** `/api/jobs/dismissed` POST body: the job id to hide + an optional reason. */
export const dismissedJobBodySchema = z.object({
  jobId: z.string().min(1),
  reason: z.string().max(200).optional(),
});

export type DismissedJobBody = z.infer<typeof dismissedJobBodySchema>;

/**
 * A tailoring session. The client owns the full shape; here we assert only the
 * fields the server keys on (a non-empty id + the resume/job ids) and keep the
 * rest via `looseObject`, so the whole session is stored as-is.
 */
export const tailoringSessionSchema = z.looseObject({
  id: z.string().min(1),
  resumeId: z.string(),
  jobId: z.string(),
  updatedAt: z.number(),
});

/** `/api/tailoring/sessions` PUT body: the session to persist. */
export const tailoringSessionBodySchema = z.object({
  session: tailoringSessionSchema,
});

export type TailoringSessionBody = z.infer<typeof tailoringSessionBodySchema>;

// Basic email shape: non-space chars, an @, a domain, and a TLD (matches the
// check the register route used before it moved to this schema).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A small denylist of the most common weak passwords. Deliberately tiny - the
 * real defense is the length minimum plus login throttling, not a big blocklist.
 */
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "11111111",
  "iloveyou",
  "letmein1",
]);

/**
 * Password policy. NIST-aligned and WCAG 2.2 SC 3.3.8 friendly: enforce a length
 * floor and block trivially weak choices, but NO composition rules (required
 * symbols/mixed case) - those fight password managers and add cognitive load
 * without real security benefit. A generous max length caps abuse while staying
 * well above anything a person types.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine(
    (p) => !COMMON_WEAK_PASSWORDS.has(p.toLowerCase()),
    "Choose a less common password"
  );

/**
 * `/api/register` body. Validates the email shape, applies the password policy,
 * and rejects a password that is just the email (or its local-part), a common
 * account-takeover shortcut.
 */
export const registerBodySchema = z
  .object({
    email: z.string().trim().regex(EMAIL_RE, "Enter a valid email address"),
    password: passwordSchema,
    name: z.string().trim().max(100).optional(),
  })
  .refine(
    (b) => {
      const pw = b.password.toLowerCase();
      const email = b.email.toLowerCase();
      return pw !== email && pw !== email.split("@")[0];
    },
    { path: ["password"], message: "Password must not match your email" }
  );

export type RegisterBody = z.infer<typeof registerBodySchema>;
