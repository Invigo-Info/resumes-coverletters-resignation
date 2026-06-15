"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Lock, CircleCheck, Loader2, ShieldAlert } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { HelpPill } from "@/components/layout/help-pill";
import { getPlan } from "@/lib/stripe/plans";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

const GUARANTEES = [
  "14-day money-back guarantee",
  "Cancel anytime online, by email, or phone",
  "Trusted by thousands of job seekers, 4.7 rating",
];

const CARD_BRANDS = ["AMEX", "VISA", "Mastercard", "Discover"];

/* ---- Right-side payment card (embedded Stripe form) --------------- */
function PaymentCard({ plan }: { plan: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise) return;
    let active = true;
    fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not start checkout");
        return data.clientSecret as string;
      })
      .then((cs) => active && setClientSecret(cs))
      .catch((e) => active && setLoadError(e.message));
    return () => {
      active = false;
    };
  }, [plan]);

  let body: React.ReactNode;
  if (!stripePromise) {
    body = (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-600">
          <ShieldAlert className="size-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">Stripe isn&apos;t configured yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and{" "}
          <code className="rounded bg-muted px-1">STRIPE_SECRET_KEY</code> (test keys) to{" "}
          <code className="rounded bg-muted px-1">.env.local</code> and restart — the secure payment
          form appears here. Test card: 4242 4242 4242 4242, any future date / CVC.
        </p>
      </div>
    );
  } else if (loadError) {
    body = (
      <p className="rounded-lg bg-red-50 px-3 py-3 text-sm font-medium text-red-600">{loadError}</p>
    );
  } else if (!clientSecret) {
    body = (
      <div className="grid place-items-center py-10">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  } else {
    body = (
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret: () => Promise.resolve(clientSecret) }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card-lg ring-1 ring-border sm:p-6">
      {body}

      {/* Trust row */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CARD_BRANDS.map((b) => (
            <span
              key={b}
              className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-neutral-700"
            >
              {b}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          SSL Secure Payment <Lock className="size-4" />
        </span>
      </div>
    </div>
  );
}

/* ---- Page --------------------------------------------------------- */
function CheckoutInner() {
  const params = useSearchParams();
  const planId = params.get("plan") || "trial";
  const plan = getPlan(planId);
  const { data: session } = useSession();

  const email = session?.user?.email ?? "—";
  const fullName = session?.user?.name ?? (email !== "—" ? email.split("@")[0] : "—");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" aria-label="resume.co home" className="inline-block">
          <LogoMark />
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: summary + account */}
          <div>
            <div className="rounded-2xl bg-secondary p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-extrabold text-foreground">Summary</h2>
                <Link href="/payment" className="text-sm font-medium text-foreground hover:underline">
                  Change package
                </Link>
              </div>
              <div className="mt-5 flex items-start justify-between">
                <span className="font-heading text-lg font-bold text-primary">{plan.name}</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-foreground">{plan.summaryAmount}</span>
                  <p className="text-xs text-muted-foreground">{plan.summaryNote}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">{plan.renewalNote}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-secondary p-6">
              <h2 className="font-heading text-2xl font-extrabold text-foreground">Account</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate font-medium text-foreground">{email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                  <dt className="text-muted-foreground">Full name</dt>
                  <dd className="truncate font-medium text-foreground">{fullName}</dd>
                </div>
              </dl>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Billing terms: Your {plan.summaryAmount} package
              {plan.id === "trial" ? " lasts 7 days." : " is billed annually."} By clicking
              &quot;Subscribe&quot; you are providing your electronic signature authorizing Resume.co
              to charge your card as described. You agree that, unless you cancel your account
              {plan.id === "trial" ? " during your 7 days try-out period" : ""}, you will be billed
              {plan.id === "trial" ? " $29.95 monthly" : " $119.40 annually"} until you cancel your
              account, which can be done quickly and easily by contacting our support team at
              855-568-0962 / support@resume.co
            </p>
          </div>

          {/* Right: payment */}
          <div>
            <PaymentCard plan={plan.id} />

            <ul className="mt-6 space-y-3">
              {GUARANTEES.map((g) => (
                <li key={g} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <CircleCheck className="size-5 shrink-0 fill-emerald-500 text-white" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <HelpPill />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
