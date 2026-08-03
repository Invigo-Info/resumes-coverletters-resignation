/**
 * Shared client + server validation for resume uploads.
 *
 * The limit is an exact decimal 10 MB (10,000,000 bytes), NOT 10 * 1024 * 1024
 * (10,485,760), so it matches the "Maximum file size: 10 MB" instruction the
 * user sees. A file of exactly 10,000,000 bytes is accepted; 10,000,001 is not.
 * Messages are plain-language on purpose - never surface raw byte counts, which
 * most users can't interpret.
 */

/** Largest accepted upload, in bytes (inclusive). */
export const MAX_UPLOAD_BYTES = 10_000_000;

/** Human-readable size cap for captions and copy. */
export const MAX_UPLOAD_LABEL = "10 MB";

/** Caption shown beneath every upload field, before a file is chosen. */
export const MAX_UPLOAD_HINT = `Maximum file size: ${MAX_UPLOAD_LABEL}.`;

/** Shown when the chosen file is over the limit. */
export const FILE_TOO_LARGE_MESSAGE =
  "File is too large. Please upload a file that is 10 MB or smaller.";

/** Shown when no file was provided at all. */
export const NO_FILE_MESSAGE = "Please select a file.";

/**
 * MIME types accepted for inline uploads sent to the model. Matches the file
 * pickers across the app (`.pdf,.doc,.docx,.txt,.md`). Anything else - an
 * executable, an archive, an image with a spoofed extension - is rejected at the
 * server boundary so a bypassed frontend can't push arbitrary bytes to the API.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

/** True when `mime` is one of the accepted upload types. */
export function isAllowedUploadType(mime: string | undefined | null): boolean {
  return (
    typeof mime === "string" &&
    (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime)
  );
}

/** Shown when an upload's type is not in the allowlist. */
export const UNSUPPORTED_FILE_MESSAGE =
  "Unsupported file type. Please upload a PDF, Word document, or text file.";

export interface UploadValidation {
  valid: boolean;
  /** Empty string when valid; a user-facing message otherwise. */
  message: string;
}

/**
 * Validate a picked/dropped file against the size cap. Callers should block the
 * upload (and keep the field available for another attempt) whenever `valid` is
 * false, without disturbing any already-accepted file.
 */
export function validateUploadFile(file?: File | null): UploadValidation {
  if (!file) return { valid: false, message: NO_FILE_MESSAGE };
  if (file.size > MAX_UPLOAD_BYTES)
    return { valid: false, message: FILE_TOO_LARGE_MESSAGE };
  return { valid: true, message: "" };
}

/**
 * Server-side size guard for an inline base64 file part. Decodes the byte length
 * from the base64 string length (accounting for padding) without materialising
 * the bytes, so an oversized upload is rejected before it reaches the model.
 */
export function base64ExceedsLimit(base64: string): boolean {
  if (!base64) return false;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  return bytes > MAX_UPLOAD_BYTES;
}
