/**
 * Product plan limits. Kept in a dependency-free leaf module so both client
 * stores/components and server routes can import the same numbers.
 */

/**
 * Free accounts may keep at most this many saved resumes. Creating one beyond
 * the cap requires an active subscription. Enforced on the client (store guard +
 * pre-emptive UI gating) and re-checked server-side in PUT /api/documents so a
 * tampered localStorage value cannot bypass it.
 */
export const FREE_RESUME_LIMIT = 3;

/**
 * Hard ceiling on one stored document's serialized `data` blob, in bytes.
 *
 * Every document is a client-owned JSON blob written straight into a jsonb
 * column, so without a cap a single account can push arbitrarily large rows -
 * exhausting storage, slowing every read of that user's document list, and
 * giving an unauthenticated-by-size denial-of-service primitive to anyone with
 * a free account. 1 MiB is roughly fifty times the largest realistic resume
 * (a long resume with every section filled serializes to ~20 KB), so it bounds
 * abuse without any chance of rejecting genuine work.
 *
 * Enforced in PUT /api/documents, which returns 413 when exceeded.
 */
export const MAX_DOCUMENT_BYTES = 1024 * 1024;
