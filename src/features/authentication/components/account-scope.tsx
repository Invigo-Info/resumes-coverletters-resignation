"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Marker key holding the email of the account whose data currently fills the
 * per-user localStorage stores. Kept OUTSIDE the "resume-co:" namespace so the
 * wipe below never clears it.
 */
const ACCOUNT_MARKER = "rw:account";

/** Remove every per-user cached store (all live under the resume-co: prefix). */
function wipeCachedUserData(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("resume-co:")) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      removed++;
    }
  } catch {
    /* storage unavailable - nothing to clear */
  }
  return removed;
}

/**
 * Per-account isolation for the localStorage-backed document stores.
 *
 * Resumes, cover/resignation letters, saved jobs and interview prep are
 * persisted per-BROWSER, not per-account. Without this, a second user signing
 * in on the same browser would see the previous user's cached documents until
 * the server merge caught up. This guard compares the signed-in email against a
 * marker; when they differ (a different user, or an unverified pre-existing
 * cache), it clears the cached stores and reloads so every store rehydrates
 * empty - the per-user server copy then repopulates the correct data. It is a
 * no-op when the same account signs back in.
 */
export function AccountScope() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) return;

    let prev: string | null = null;
    try {
      prev = localStorage.getItem(ACCOUNT_MARKER);
    } catch {
      /* storage unavailable */
    }
    if (prev === email) return; // same account - keep its cached data

    // Different (or unverified) account: claim the browser for this user and
    // drop any stale cached documents so they cannot leak across accounts.
    try {
      localStorage.setItem(ACCOUNT_MARKER, email);
    } catch {
      /* storage unavailable */
    }
    const removed = wipeCachedUserData();
    // Only reload when there was actually cached data to clear (avoids a
    // needless reload on a fresh browser where the stores are already empty).
    if (removed > 0 && typeof window !== "undefined") {
      window.location.reload();
    }
  }, [status, session?.user?.email]);

  return null;
}
