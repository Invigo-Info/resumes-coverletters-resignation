"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Infinity as InfinityIcon,
  Sparkles,
  FileText,
  Briefcase,
  CircleCheck,
  Star,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { HelpPill } from "@/components/layout/help-pill";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import { cn } from "@/lib/utils";

// Icons paired positionally with a plan's feature list (extra features fall back to a check).
const FEATURE_ICONS = [InfinityIcon, Sparkles, FileText, Briefcase];

// Reassurance bullets shown alongside the plan pitch.
const GUARANTEES = [
  "14-day money-back guarantee",
  "Cancel anytime online, by email, or phone",
  "Trusted by thousands of job seekers, 4.7 rating",
];

// Static social-proof testimonials rendered in the reviews section.
const REVIEWS = [
  {
    name: "Maria S.",
    text: "Built a tailored resume in minutes and landed two interviews the same week. Worth every cent.",
  },
  {
    name: "James T.",
    text: "The AI cover letters are shockingly good. The job-match feed kept me applying every day.",
  },
  {
    name: "Priya K.",
    text: "Clean templates, easy editing, instant PDF downloads. Cancelling was simple too — no hassle.",
  },
];

// Row of filled star icons used for the Trustpilot-style rating display.
function Stars({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="grid size-5 place-items-center bg-[#00B67A]">
          <Star className="size-3.5 fill-white text-white" />
        </span>
      ))}
    </div>
  );
}

/**
 * Pricing / plan-selection page. Lets the user pick a trial or annual plan, then
 * forwards the chosen plan to the checkout page via the ?plan query param.
 */
export default function PaymentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>("trial");

  // Carry the selected plan into checkout.
  function onContinue() {
    router.push(`/payment/checkout?plan=${selected}`);
  }

  const trial = PLANS.trial;
  const annual = PLANS.annual;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Link href="/" aria-label="resume.co home" className="inline-block">
          <LogoMark />
        </Link>

        {/* Hero */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: pitch */}
          <div>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              Subscribe now and get unlimited resume downloads &amp; more
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Ace your career with Resume.co premium subscription. Build and tailor unlimited resumes
              for every job, generate custom cover letters, and explore extra design options.
            </p>
            <ul className="mt-8 space-y-3">
              {GUARANTEES.map((g) => (
                <li key={g} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <CircleCheck className="size-5 shrink-0 fill-emerald-500 text-white" />
                  {g}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: plan selector */}
          <div className="space-y-4">
            {/* Trial plan */}
            <button
              type="button"
              onClick={() => setSelected("trial")}
              className={cn(
                "w-full rounded-2xl bg-card p-6 text-left ring-1 transition-all",
                selected === "trial" ? "shadow-card-lg ring-2 ring-primary" : "shadow-card ring-border hover:ring-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xl font-bold text-primary">{trial.name}</span>
                  {trial.badge && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {trial.badge}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-foreground">{trial.priceLabel}</span>
              </div>

              <ul className="mt-5 space-y-3">
                {trial.features.map((f, i) => {
                  const Icon = FEATURE_ICONS[i] ?? CircleCheck;
                  return (
                    <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      {f}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-5 text-sm text-muted-foreground">{trial.renewalNote}</p>
            </button>

            {/* Annual plan */}
            <button
              type="button"
              onClick={() => setSelected("annual")}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl bg-card px-6 py-5 text-left ring-1 transition-all",
                selected === "annual" ? "shadow-card-lg ring-2 ring-primary" : "shadow-card ring-border hover:ring-primary/40"
              )}
            >
              <span className="font-heading text-xl font-bold text-primary">{annual.name}</span>
              <span className="text-foreground">
                <span className="text-2xl font-extrabold">{annual.priceLabel}</span>
                <span className="text-sm text-muted-foreground"> {annual.priceSuffix}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="h-14 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-16 border-t border-border pt-14">
          <h2 className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Check our top-rated reviews
          </h2>

          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Excellent</span>
              <Stars />
              <span className="text-sm text-foreground">
                <span className="font-bold">4.7</span> out of 5
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on <span className="font-semibold text-foreground">13,245 reviews</span>{" "}
              <span className="font-semibold text-[#00B67A]">★ Trustpilot</span>
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
                <Stars />
                <p className="mt-3 text-sm text-foreground">{r.text}</p>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HelpPill />
    </div>
  );
}
