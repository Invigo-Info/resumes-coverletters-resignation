"use client";

import { create } from "zustand";

/**
 * Mock paywall gate for the cover-letter download (mirrors builder.resume.co,
 * where Download prompts an upgrade). `premium` starts false so the first
 * Download opens the upgrade dialog; "Continue" unlocks it for the session and
 * runs the pending download, keeping the flow testable end-to-end.
 */
interface PaywallState {
  open: boolean;
  premium: boolean;
  pending: (() => void | Promise<void>) | null;
  /** Run `action` if unlocked, otherwise open the upgrade dialog. */
  requestDownload: (action: () => void | Promise<void>) => void;
  /** Unlock and run whatever download was pending. */
  unlock: () => void;
  close: () => void;
}

export const usePaywall = create<PaywallState>((set, get) => ({
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
}));
