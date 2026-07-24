"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/store/safe-storage";

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
