import Stripe from "stripe";

/** Server-side Stripe client. Returns null when the secret key isn't set. */
let cached: Stripe | null = null;

/** Lazily create and cache the Stripe client; null when the key is unset. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

/** True when a Stripe secret key is configured (real checkout available). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
