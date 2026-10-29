// @vitest-environment node
import { describe, it, expect } from "vitest";
import { shouldApplyEvent } from "@/services/payments/events";

/**
 * Stripe guarantees at-least-once delivery and NO ordering. The webhook relies
 * on `shouldApplyEvent` to make the second property harmless.
 *
 * The bug this locks down is a real revenue leak, not a theoretical one: a
 * `customer.subscription.updated` carrying `status: active`, generated before a
 * cancellation but delivered after it, used to be applied unconditionally. The
 * row flipped back from `canceled` to `active` and the customer kept premium
 * they had cancelled and were no longer paying for - with nothing in the logs
 * to show why.
 */
describe("shouldApplyEvent", () => {
  const T = 1_700_000_000_000;

  it("applies an event when no event time is stored yet", () => {
    // Rows written before the ordering column existed have null here, and must
    // not be frozen out of all future updates.
    expect(shouldApplyEvent(null, T)).toBe(true);
    expect(shouldApplyEvent(undefined, T)).toBe(true);
  });

  it("applies a newer event", () => {
    expect(shouldApplyEvent(T, T + 1000)).toBe(true);
  });

  it("REFUSES an event older than the state already stored", () => {
    // The resurrection case: a stale "active" arriving after a cancellation.
    expect(shouldApplyEvent(T, T - 1000)).toBe(false);
  });

  it("applies an event with the same timestamp", () => {
    // Stripe stamps `created` in whole seconds, so two genuinely distinct
    // events routinely share one timestamp. Refusing the second would silently
    // drop a real state change, which is worse than applying both in order.
    expect(shouldApplyEvent(T, T)).toBe(true);
  });

  it("refuses an event that predates storage by a long way", () => {
    // A webhook endpoint replaying a backlog after an outage.
    expect(shouldApplyEvent(T, T - 7 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
