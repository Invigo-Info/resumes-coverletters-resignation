"use client";

import { useEffect } from "react";
import { usePaywall } from "@/lib/cover-letter/paywall";

/**
 * Marks the account premium once checkout completes. Rendered on the payment
 * success page (client-only) so the persisted paywall flag flips to true, and
 * subsequent downloads - on the dashboard, editor, or tailoring - go straight
 * through instead of bouncing back to /payment. Renders nothing.
 */
export function UnlockPremium() {
  const unlock = usePaywall((s) => s.unlock);
  useEffect(() => {
    unlock();
  }, [unlock]);
  return null;
}
