"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "@/utilities/consent";
import {
  CONSENT_BOOTSTRAP,
  GA_ID,
  GTM_ID,
  gaDirectConfigured,
  gtmConfigured,
  googleTagsConfigured,
  pushConsentUpdate,
} from "@/utilities/google-tags";

/**
 * Loads Google Tag Manager, or GA4 directly - but never both, and never before
 * consent.
 *
 * Two layers of gating, and both are deliberate:
 *
 *   1. The <Script> is simply not RENDERED until the matching consent is
 *      granted. Nothing is fetched, nothing is set. This is stricter than
 *      Consent Mode alone and is the layer that actually protects the visitor.
 *   2. Consent Mode v2 signals are pushed anyway. A GTM container can be edited
 *      by someone who never reads this file, so the tags inside it are also
 *      told in Google's own vocabulary what they may do.
 *
 * Renders nothing at all when no Google id is configured, which is the default
 * - so this costs users nothing until someone sets a key.
 */
export function GoogleTags() {
  const analytics = useConsent((s) => s.analytics);
  const marketing = useConsent((s) => s.marketing);

  // Keep Google's own consent state in step with ours, including on withdrawal.
  useEffect(() => {
    if (!googleTagsConfigured()) return;
    pushConsentUpdate({
      analytics: analytics === true,
      marketing: marketing === true,
    });
  }, [analytics, marketing]);

  if (!googleTagsConfigured()) return null;

  // GTM is gated on `marketing`: it is a container, and what it loads can change
  // without a deploy, so it is consented to at the broadest purpose it could
  // serve. GA4 loaded directly is analytics only.
  const allowGtm = gtmConfigured() && marketing === true;
  const allowGa = gaDirectConfigured() && analytics === true;

  return (
    <>
      {/* The bootstrap declares gtag and queues denied-by-default consent. It
          must execute before any container, hence beforeInteractive. */}
      <Script
        id="google-consent-bootstrap"
        strategy="beforeInteractive"
        // Static string from our own module - no user input reaches it.
        dangerouslySetInnerHTML={{ __html: CONSENT_BOOTSTRAP }}
      />

      {allowGtm && (
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`}
        />
      )}

      {allowGa && (
        <>
          <Script
            id="ga-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`gtag('js', new Date());gtag('config', ${JSON.stringify(GA_ID)}, { send_page_view: true });`}
          </Script>
        </>
      )}
    </>
  );
}
