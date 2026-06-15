/** Subscription plans shown on the payment pages (from the resume.co screenshots). */

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
  /** Stripe inline price (test sample). */
  stripe: {
    unitAmount: number; // in cents
    interval: "month" | "year";
    trialDays: number;
    productName: string;
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
    stripe: { unitAmount: 2995, interval: "month", trialDays: 7, productName: "Resume.co Premium (monthly)" },
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
    stripe: { unitAmount: 11940, interval: "year", trialDays: 0, productName: "Resume.co Premium (annual)" },
  },
};

export function getPlan(id: string | null | undefined): Plan {
  return id === "annual" ? PLANS.annual : PLANS.trial;
}
