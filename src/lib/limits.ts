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
