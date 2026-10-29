/** Subscription plans shown on the payment pages (from the resume.co screenshots). */

/** The two subscription plans offered at checkout. */
export type PlanId = "trial" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  badge?: string;
  /** Amount charged/displayed for the plan headline. */
  priceLabel: string;
  /** Suffix next to the price, e.g. "/month". */
  priceSuffix?: string;
  /** Renewal / billing note shown under the plan. */
  renewalNote: string;
  features: string[];
  /** What the checkout "Summary" shows as due. */
  summaryAmount: string;
  summaryNote: string;
  /** Stripe inline price. */
  stripe: {
    /** The RECURRING amount, in cents, charged every `interval`. */
    unitAmount: number;
    interval: "month" | "year";
    /** Days before the recurring charge starts. 0 = bills immediately. */
    trialDays: number;
    /**
     * Amount charged UP FRONT, in cents, when the plan has a paid trial.
     *
     * `trialDays` alone gives Stripe a FREE trial: it bills nothing today and
     * `unitAmount` on day `trialDays`. That is not what a "$1.95 for 7 days"
     * plan promises, so the upfront amount is added to the Checkout Session as
     * a separate ONE-TIME line item. Stripe puts one-time prices on the initial
     * invoice only, which bills it immediately while the recurring price waits
     * out the trial - exactly the paid-trial shape.
     *
     * Omit for plans that simply bill their full amount today.
     */
    upfrontAmount?: number;
    productName: string;
    /** Product name for the upfront charge, shown as its own checkout line. */
    upfrontProductName?: string;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "7-day trial",
    badge: "POPULAR",
    priceLabel: "$1.95",
    renewalNote: "After 7 days, it renews to $29.95 billed monthly, and you can cancel at any time",
    features: [
      "Unlimited resume downloads",
      "AI-tailored resumes for each job",
      "Custom AI-generated cover letters",
      "Daily updated job matches based on your resume",
    ],
    summaryAmount: "$1.95",
    summaryNote: "Tax may apply",
    // $1.95 billed today, then $29.95/month from day 7. The upfront amount MUST
    // match priceLabel/summaryAmount above: they are what the user is shown
    // before paying. They disagreed previously - the page advertised $1.95
    // while Stripe was told to run a free trial and charge $29.95 on day 7, so
    // no code path ever charged $1.95 at all.
    stripe: {
      unitAmount: 2995,
      interval: "month",
      trialDays: 7,
      upfrontAmount: 195,
      productName: "Resumewriter.ai Premium (monthly)",
      upfrontProductName: "Resumewriter.ai 7-day trial",
    },
  },
  annual: {
    id: "annual",
    name: "Annual plan",
    priceLabel: "$9.95",
    priceSuffix: "/month",
    renewalNote: "Billed $119.40 once a year. Cancel at any time.",
    features: [
      "Unlimited resume downloads",
      "AI-tailored resumes for each job",
      "Custom AI-generated cover letters",
      "Daily updated job matches based on your resume",
    ],
    summaryAmount: "$119.40",
    summaryNote: "Billed annually · tax may apply",
    stripe: { unitAmount: 11940, interval: "year", trialDays: 0, productName: "Resumewriter.ai Premium (annual)" },
  },
};

/** Resolve a plan by id, defaulting to the trial plan for unknown/missing ids. */
export function getPlan(id: string | null | undefined): Plan {
  return id === "annual" ? PLANS.annual : PLANS.trial;
}
