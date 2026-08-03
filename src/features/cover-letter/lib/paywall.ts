"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";

/**
 * Paywall gate for downloads / AI tailoring (mirrors builder.resume.co, where
 * Download prompts an upgrade). `premium` starts false so the first Download
 * opens the upgrade dialog or the /payment flow; completing checkout calls
 * `unlock()`. The `premium` flag is PERSISTED to localStorage so it survives the
 * Stripe redirect and page reloads - once you've paid, downloads work everywhere
 * (dashboard, editor, tailoring) until the flag is cleared. `open`/`pending` are
 * transient UI state and are not persisted.
 */
interface PaywallState {
  open: boolean;
  premium: boolean;
  pending: (() => void | Promise<void>) | null;
  /** Run `action` if unlocked, otherwise open the upgrade dialog. */
  requestDownload: (action: () => void | Promise<void>) => void;
  /** Unlock (mark premium) and run whatever download was pending. */
  unlock: () => void;
  close: () => void;
}

export const usePaywall = create<PaywallState>()(
  persist(
    (set, get) => ({
      open: false,
      premium: false,
      pending: null,
      requestDownload: (action) => {
        if (get().premium) {
          void action();
          return;
        }
        set({ open: true, pending: action });
      },
      unlock: () => {
        const { pending } = get();
        set({ premium: true, open: false, pending: null });
        if (pending) void pending();
      },
      close: () => set({ open: false, pending: null }),
    }),
    {
      name: "resume-co:paywall",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      // Only the durable entitlement is persisted; open/pending are per-session.
      partialize: (s) => ({ premium: s.premium }),
    }
  )
);

/**
 * Server-authoritative entitlement. The persisted `premium` above is only a
 * cache / dev convenience; a tampered localStorage value must not unlock premium
 * in production. On load, ask the server: when it reports `source === "server"`
 * (DB + Stripe configured), its value wins - granting OR revoking access. When
 * the server is unconfigured (local dev), the local flag is left as-is.
 */
if (typeof window !== "undefined") {
  void fetch("/api/entitlement")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { premium?: boolean; source?: string } | null) => {
      if (d && d.source === "server") {
        usePaywall.setState({ premium: Boolean(d.premium) });
      }
    })
    .catch(() => {
      /* offline / not signed in - keep the local flag */
    });
}
