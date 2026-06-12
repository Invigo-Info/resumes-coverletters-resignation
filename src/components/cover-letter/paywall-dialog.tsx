"use client";

import { Check, Crown, X } from "lucide-react";
import { usePaywall } from "@/lib/cover-letter/paywall";

const DEFAULT_PERKS = [
  "Unlimited cover letter downloads (PDF & Word)",
  "AI-tailored letters for every job posting",
  "All premium fonts, colors, and templates",
  "Matching resume + cover letter bundle",
];

/**
 * Upgrade dialog shown when a free user tries to download. Copy defaults to the
 * cover-letter wording but can be overridden (e.g. for resignation letters).
 */
export function PaywallDialog({
  title = "Download your cover letter",
  subtitle = "Upgrade to Premium to download and unlock everything you need to land the job.",
  perks = DEFAULT_PERKS,
}: {
  title?: string;
  subtitle?: string;
  perks?: string[];
} = {}) {
  const open = usePaywall((s) => s.open);
  const unlock = usePaywall((s) => s.unlock);
  const close = usePaywall((s) => s.close);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-card-lg ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="px-7 pb-7 pt-9 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Crown className="size-7" />
          </span>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <ul className="mt-6 space-y-3 text-left">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="size-3" />
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <button
            onClick={unlock}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Continue to download
          </button>
          <button
            onClick={close}
            className="mt-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
