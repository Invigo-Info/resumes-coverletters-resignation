"use client";

/**
 * A localStorage-backed StateStorage that never throws on write.
 *
 * Resume data can carry an embedded profile photo, and photos are duplicated
 * across the active resume plus every saved draft - which can push localStorage
 * past its ~5MB quota. An uncaught QuotaExceededError from a persist write
 * crashes the whole app (e.g. the tailoring page while loading a resume with a
 * large photo). This wrapper catches quota failures, tries one reclaim + retry,
 * then degrades gracefully - the in-memory store keeps working, only the on-disk
 * copy lags - instead of throwing. Reads and removes pass straight through and
 * also swallow errors (private mode, disabled storage).
 */

import type { StateStorage } from "zustand/middleware";

/** True for a storage-quota error across browsers. */
function isQuotaError(e: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22 ||
      e.code === 1014)
  );
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      // Non-quota failures (disabled storage, private mode) are ignored too -
      // never let a persist write crash the app.
      if (!isQuotaError(e)) return;
      // Reclaim: drop this key's old value first, then retry once.
      try {
        localStorage.removeItem(name);
        localStorage.setItem(name, value);
      } catch {
        // Still over quota: keep the in-memory state, skip persisting this write.
        if (typeof console !== "undefined") {
          console.warn(
            `[storage] Skipped persisting "${name}": localStorage quota exceeded. ` +
              `Remove or replace large profile photos to free space.`
          );
        }
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
