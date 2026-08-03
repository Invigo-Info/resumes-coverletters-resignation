import type { Metadata } from "next";
import { LegalShell } from "@/components/common/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern your use of Resumewriter.ai.",
};

/**
 * Terms of Use - template reflecting the actual service (AI resume / cover-letter
 * / resignation-letter builder + job tools) and billing (7-day trial then
 * monthly, or annual; via Stripe; cancel anytime). Must be reviewed by a lawyer
 * before launch, especially billing, disclaimers, and governing law.
 */
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated="27 July 2026">
      <p>
        These Terms of Use ("Terms") govern your access to and use of Resumewriter.ai
        (the "service"). By creating an account or using the service, you agree to
        these Terms. If you do not agree, do not use the service.
      </p>

      <h2>1. Who can use the service</h2>
      <p>
        You must be at least 16 years old and able to form a binding contract. You
        are responsible for the accuracy of the information you provide.
      </p>

      <h2>2. The service</h2>
      <p>
        Resumewriter.ai is an AI-assisted tool for building resumes, cover letters, and
        resignation letters, plus features for job search, resume tailoring, and
        interview preparation. Features may change over time.
      </p>

      <h2>3. Your account</h2>
      <p>
        You are responsible for maintaining the confidentiality of your login and
        for all activity under your account. Notify us promptly of any
        unauthorized use.
      </p>

      <h2>4. Subscriptions, billing, and cancellation</h2>
      <ul>
        <li>
          Paid plans are billed through Stripe. A plan may start with a trial
          (for example, a 7-day trial that then renews monthly) or be billed
          annually, as shown at checkout.
        </li>
        <li>
          <strong>Auto-renewal:</strong> subscriptions renew automatically at the
          then-current price until you cancel. By subscribing, you authorize
          recurring charges.
        </li>
        <li>
          <strong>Cancellation:</strong> you can cancel at any time; access
          continues until the end of the current billing period. Deleting your
          account also cancels an active subscription.
        </li>
        <li>
          <strong>Refunds:</strong> except where required by law, payments are
          non-refundable. (Adjust this to your actual refund policy.)
        </li>
        <li>
          Prices and plan details are set on our checkout pages and may change on
          a going-forward basis.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for anything unlawful or to submit false information as another person.</li>
        <li>Attempt to break, overload, reverse engineer, or gain unauthorized access to the service or other users' data.</li>
        <li>Abuse the AI features to generate harmful, deceptive, or infringing content.</li>
      </ul>

      <h2>6. Your content</h2>
      <p>
        You retain ownership of the content you create. You grant us a limited
        license to store and process it solely to provide the service (including
        sending your inputs to our AI provider to generate the output you
        request). You are responsible for the content you enter and for reviewing
        AI output before you rely on it.
      </p>

      <h2>7. AI output and no guarantee of results</h2>
      <p>
        AI-generated text is assistive and may be inaccurate, incomplete, or
        generic. You must review and edit it. We do not guarantee interviews,
        job offers, or any specific outcome from using the service.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The service, including its software, design, and branding, is owned by us
        and protected by law. These Terms do not grant you any rights to our
        trademarks or to copy the platform.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The service is provided "as is" and "as available" without warranties of
        any kind, to the fullest extent permitted by law.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect,
        incidental, or consequential damages, and our total liability is limited
        to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend or terminate
        access if you violate these Terms or to protect the service.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        reflected by updating the date above; continued use means you accept the
        updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of [your jurisdiction]. (Set your
        actual governing law and dispute-resolution terms with your attorney.)
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:support@your-domain.com">support@your-domain.com</a>{" "}
        (replace with your real support address before launch).
      </p>
    </LegalShell>
  );
}
