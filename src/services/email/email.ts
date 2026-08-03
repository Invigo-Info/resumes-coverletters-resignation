import { Resend } from "resend";

/**
 * Transactional email via Resend. Server-only, and INERT until configured: with
 * no RESEND_API_KEY set, every send is a no-op that returns `{ skipped: true }`,
 * so the app runs unchanged locally and in any environment without the key.
 * Sends are best-effort - callers must never block a user action on delivery.
 *
 * Setup: set RESEND_API_KEY and EMAIL_FROM (a verified-domain sender, e.g.
 * "Resumewriter.ai <hello@your-domain.com>"). The resend.dev default only delivers to
 * the account owner and is for testing.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** True when Resend is configured. */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Send one email. Returns `{ skipped: true }` when email is not configured. */
export async function sendEmail(
  args: SendArgs
): Promise<{ ok: boolean; skipped?: boolean }> {
  const resend = getClient();
  if (!resend) return { ok: false, skipped: true };
  const from =
    process.env.EMAIL_FROM || "Resumewriter.ai <onboarding@resend.dev>";
  try {
    await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false };
  }
}

/** Format a Stripe amount (in the currency's minor unit, e.g. cents) for display. */
function formatAmount(minorUnits: number, currency: string): string {
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(minorUnits / 100);
  } catch {
    return `${(minorUnits / 100).toFixed(2)} ${code}`;
  }
}

/** The parts of a Stripe invoice needed for a receipt email. */
export interface ReceiptDetails {
  /** Amount actually paid, in the currency's minor unit (e.g. cents). */
  amountPaid: number;
  currency: string;
  invoiceNumber?: string | null;
  hostedInvoiceUrl?: string | null;
}

/**
 * Payment receipt sent on a successful charge (best-effort, non-blocking). No-op
 * when email is not configured or the amount is zero (e.g. a trial's $0 invoice).
 */
export async function sendReceiptEmail(
  to: string,
  r: ReceiptDetails
): Promise<void> {
  if (!isEmailEnabled() || r.amountPaid <= 0) return;
  const amount = formatAmount(r.amountPaid, r.currency);
  const invLine = r.invoiceNumber ? `Invoice ${r.invoiceNumber}` : "";
  const linkHtml = r.hostedInvoiceUrl
    ? `<p style="margin-top:16px"><a href="${r.hostedInvoiceUrl}">View or download your invoice</a></p>`
    : "";
  const linkText = r.hostedInvoiceUrl
    ? `\nView or download your invoice: ${r.hostedInvoiceUrl}`
    : "";
  await sendEmail({
    to,
    subject: "Your Resumewriter.ai receipt",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
      <h1 style="font-size:20px;margin:0 0 12px">Thanks for your payment</h1>
      <p>We have received your payment of <strong>${amount}</strong> for your Resumewriter.ai subscription.</p>
      ${invLine ? `<p style="color:#666;font-size:13px">${invLine}</p>` : ""}
      ${linkHtml}
      <p style="color:#666;font-size:13px;margin-top:24px">You can manage or cancel your subscription any time from your account settings.</p>
    </div>`,
    text: `Thanks for your payment.\n\nWe have received your payment of ${amount} for your Resumewriter.ai subscription.${invLine ? `\n${invLine}` : ""}${linkText}\n\nYou can manage or cancel your subscription any time from your account settings.`,
  });
}

/** Welcome email sent after a successful sign-up (best-effort, non-blocking). */
export async function sendWelcomeEmail(
  to: string,
  name?: string
): Promise<void> {
  if (!isEmailEnabled()) return;
  const first = (name || to.split("@")[0] || "there").trim();
  const heading = `Welcome to Resumewriter.ai, ${first}`;
  await sendEmail({
    to,
    subject: "Welcome to Resumewriter.ai",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      <p>Your account is ready. You can build resumes, cover letters, and resignation letters, then tailor them to a job with AI assistance.</p>
      <p>Sign in any time to pick up where you left off.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">If you did not create this account, you can ignore this email.</p>
    </div>`,
    text: `${heading}\n\nYour account is ready. Build resumes, cover letters, and resignation letters, then tailor them to a job with AI assistance.\n\nIf you did not create this account, you can ignore this email.`,
  });
}
