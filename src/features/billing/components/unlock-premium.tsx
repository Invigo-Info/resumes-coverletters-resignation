"use client";

import { useEffect } from "react";
import { usePaywall } from "@/features/cover-letter/lib/paywall";
import { capture } from "@/utilities/analytics";
import { EVENTS } from "@/utilities/analytics-events";

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
    // This component renders only after the server has verified the Checkout
    // Session belongs to this account AND was paid, so it is a trustworthy
    // place to mark the conversion - unlike the arrival of the URL itself.
    void capture(EVENTS.checkoutCompleted);
  }, [unlock]);
  return null;
}
