// Create or update the Stripe Customer Portal configuration for this account.
//
//   node scripts/stripe-portal-config.mjs            create (or update) it
//   node scripts/stripe-portal-config.mjs --show     print the current one
//
// Why a script rather than the dashboard. The portal is the ONLY way a customer
// can cancel a $1.95 -> $29.95/month subscription themselves, so what it allows
// is a compliance-relevant setting, not a preference. Clicking it into one
// dashboard leaves no record, cannot be reviewed, and has to be redone from
// memory in live mode - where getting it wrong means customers who cannot
// cancel. This file is that configuration, in the repo, applied identically to
// test and live depending only on which STRIPE_SECRET_KEY is set.
//
// It prints a configuration id. Put it in the environment as
// STRIPE_PORTAL_CONFIGURATION_ID and /api/billing/portal will use it; with the
// variable unset the portal falls back to the account's dashboard default, so
// nothing breaks if this is never run.
import { readFileSync, existsSync } from "node:fs";
import Stripe from "stripe";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set (.env.local).");
  process.exit(1);
}

const mode = key.startsWith("sk_live")
  ? "LIVE"
  : key.startsWith("sk_test")
    ? "test"
    : "unrecognised";
const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(
  /\/+$/,
  ""
);

const stripe = new Stripe(key);
const showOnly = process.argv.includes("--show");

/**
 * The configuration itself.
 *
 * `subscription_cancel.mode: at_period_end` - cancelling stops the next charge
 * but leaves access for the rest of the paid period. Cancelling immediately
 * would mean a customer who cancels on day 2 of a month they already paid for
 * loses 28 days they are owed, which generates exactly the dispute the portal
 * exists to avoid.
 *
 * `subscription_update` is deliberately NOT enabled: it requires fixed Price
 * objects to switch between, and checkout builds its prices inline from
 * `plans.ts` (`price_data`). Enabling it with nothing to switch to would show
 * the customer a broken plan-change screen.
 */
const params = {
  business_profile: {
    // Stripe shows these in the portal footer; both pages already exist.
    privacy_policy_url: `${site}/privacy`,
    terms_of_service_url: `${site}/terms`,
  },
  default_return_url: `${site}/account`,
  features: {
    customer_update: {
      enabled: true,
      // Email and tax id, but NOT the billing address wholesale - address is
      // needed for tax, and letting it be edited freely can change the tax
      // treatment of an active subscription.
      allowed_updates: ["email", "tax_id"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      cancellation_reason: {
        enabled: true,
        options: [
          "too_expensive",
          "missing_features",
          "switched_service",
          "unused",
          "customer_service",
          "too_complex",
          "low_quality",
          "other",
        ],
      },
    },
  },
};

const existingId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

try {
  if (showOnly) {
    const list = await stripe.billingPortal.configurations.list({ limit: 10 });
    console.log(`mode: ${mode}\nconfigurations (${list.data.length}):`);
    for (const c of list.data) {
      console.log(
        `  ${c.id}  default=${c.is_default}  active=${c.active}  cancel=${c.features?.subscription_cancel?.enabled}`
      );
    }
    process.exit(0);
  }

  let config;
  if (existingId) {
    config = await stripe.billingPortal.configurations.update(
      existingId,
      params
    );
    console.log(`Updated existing configuration (${mode} mode).`);
  } else {
    config = await stripe.billingPortal.configurations.create(params);
    console.log(`Created configuration (${mode} mode).`);
  }

  console.log(`\n  id: ${config.id}`);
  console.log(`  cancellation: ${config.features.subscription_cancel.enabled} (${config.features.subscription_cancel.mode})`);
  console.log(`  payment method update: ${config.features.payment_method_update.enabled}`);
  console.log(`  invoice history: ${config.features.invoice_history.enabled}`);
  console.log(`  return url: ${config.default_return_url}`);
  console.log(
    `\nAdd this to the ${mode === "LIVE" ? "production" : "local"} environment:\n` +
      `  STRIPE_PORTAL_CONFIGURATION_ID=${config.id}`
  );
} catch (err) {
  console.error("\nFailed:", err?.message ?? err);
  process.exitCode = 1;
}
