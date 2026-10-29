"use client";

import { ConsentPreferencesLink } from "@/components/common/consent/consent-banner";

/**
 * Footer links. Support is a mailto - replace the placeholder domain with your
 * real support address before launch. Privacy / Terms point to the legal pages.
 */
const LINKS: { label: string; href: string }[] = [
  { label: "Support", href: "mailto:support@your-domain.com" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of use", href: "/terms" },
];

/** Site-wide footer: copyright line plus the secondary navigation links. */
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-8 text-center text-sm text-muted-foreground print:hidden">
      <span>© 2026, Resumewriter.ai. All rights reserved</span>
      <span aria-hidden className="hidden sm:inline">·</span>
      <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {LINKS.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-x-2">
            {/* min-h-6: WCAG 2.5.8 target size (24 CSS px). These measured
                23px - one pixel short, and invisible without measuring. */}
            <a
              href={link.href}
              className="inline-flex min-h-6 items-center hover:text-foreground"
            >
              {link.label}
            </a>
            {i < LINKS.length - 1 && <span aria-hidden>·</span>}
          </span>
        ))}
        {/* Consent must be as easy to withdraw as to give, so the entry point
            is permanent rather than a one-time banner. Renders nothing when
            there is no optional storage in this deployment. */}
        <ConsentPreferencesLink className="inline-flex min-h-6 items-center hover:text-foreground" />
      </span>
    </footer>
  );
}
