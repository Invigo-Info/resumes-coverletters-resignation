import { deleteUser } from "./users";
import { deleteAllDocuments } from "./documents";
import { clearSavedJobs } from "@/features/jobs/lib/saved";
import { clearDismissedJobs } from "@/features/jobs/lib/dismissed";
import { clearTailoringSessions } from "@/features/jobs/tailoring/sessions";
import { deleteEntitlement } from "@/permissions/entitlements";

/**
 * Account erasure - removing every trace of one account from every store.
 *
 * This exists because "delete the user" was never the same thing as "delete the
 * user's data" in this app, and the gap was invisible:
 *
 * 1. Six stores are keyed by email (users, documents, subscriptions, saved_jobs,
 *    dismissed_jobs, tailoring_sessions). Deleting an account used to touch only
 *    the first. The other five were left behind indefinitely.
 * 2. There is no cascade to rely on. schema.sql deliberately DROPS
 *    documents_email_fkey, and the other tables never had a foreign key either,
 *    because OAuth accounts legitimately own data without ever having a `users`
 *    row. The old code carried a comment claiming an ON DELETE CASCADE removed
 *    documents; no such constraint exists.
 * 3. Worse, for a Google/OAuth account there IS no `users` row, so the previous
 *    implementation deleted literally nothing while reporting success.
 *
 * Any new per-user store must be added to `purges` below. That list is the whole
 * contract, and tests/unit/account-deletion.test.ts asserts the data is gone.
 */

/** Every per-user store, as (name, purge) pairs. Add new stores here. */
const purges: { store: string; purge: (email: string) => Promise<void> }[] = [
  { store: "documents", purge: deleteAllDocuments },
  { store: "savedJobs", purge: clearSavedJobs },
  { store: "dismissedJobs", purge: clearDismissedJobs },
  { store: "tailoringSessions", purge: clearTailoringSessions },
  { store: "entitlement", purge: deleteEntitlement },
  // users LAST: it is the record that proves the account existed, so losing it
  // first would strand the rest with no way to find them again.
  { store: "user", purge: deleteUser },
];

/** What erasure did. `failed` is empty on full success. */
export interface DeleteAccountResult {
  deleted: string[];
  failed: { store: string; error: string }[];
}

/**
 * Erase every stored trace of `email`.
 *
 * Runs every purge even if an earlier one throws, so one failing store cannot
 * strand the rest - partial erasure beats abandoning the attempt halfway. The
 * caller decides what to do about `failed`; reporting success while data
 * remains is the one outcome that is not acceptable, because the user has been
 * told their data is gone.
 *
 * Not transactional across stores: they span two backends (Postgres and the
 * local file store) and, for entitlements, an external system. The
 * run-all-then-report design is the honest alternative to a transaction we
 * cannot actually provide.
 */
export async function deleteAccount(email: string): Promise<DeleteAccountResult> {
  const result: DeleteAccountResult = { deleted: [], failed: [] };

  for (const { store, purge } of purges) {
    try {
      await purge(email);
      result.deleted.push(store);
    } catch (err) {
      result.failed.push({
        store,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
