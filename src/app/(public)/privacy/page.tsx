import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Resumewriter.ai collects, uses, and protects your information.",
};

/**
 * Privacy Policy - template reflecting the app's actual data practices
 * (Supabase database, Google Gemini for AI, Stripe for payments, NextAuth for
 * sign-in, no selling of data). Must be reviewed by a lawyer before launch.
 */
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="27 July 2026">
      <p>
        This Privacy Policy explains what information Resumewriter.ai ("we", "us")
        collects, how we use it, and the choices you have. By using the service
        you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> your email address and display
          name. If you register with a password, we store a securely hashed
          version of it (never the password itself). If you sign in with Google,
          we receive your basic Google profile (name and email).
        </li>
        <li>
          <strong>Content you create:</strong> the resumes, cover letters, and
          resignation letters you build. This content often contains personal
          data you choose to include, such as your contact details, work
          history, education, and skills.
        </li>
        <li>
          <strong>Payment information:</strong> when you subscribe, payment is
          processed by Stripe. We do not receive or store your full card number;
          we store only subscription status and identifiers needed to manage your
          plan.
        </li>
        <li>
          <strong>Usage and device data:</strong> basic technical data (such as
          IP address and browser information) used to operate and secure the
          service, including rate limiting.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide and maintain the service and your account.</li>
        <li>
          To generate AI-assisted content you request (summaries, bullet points,
          cover letters, job matches, interview prep).
        </li>
        <li>To process subscriptions and payments.</li>
        <li>To secure the service and prevent abuse.</li>
      </ul>

      <h2>Service providers we share data with</h2>
      <p>
        We do not sell your personal information. We share it only with providers
        that help us run the service, under their terms:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> - database and hosting for your account and
          documents.
        </li>
        <li>
          <strong>Vercel</strong> - application hosting.
        </li>
        <li>
          <strong>Google (Gemini API)</strong> - to generate AI content from the
          inputs you provide. Content you submit for generation is sent to Google
          to produce a response.
        </li>
        <li>
          <strong>Stripe</strong> - payment processing and subscription
          management.
        </li>
        <li>
          <strong>Google OAuth</strong> - if you choose to sign in with Google.
        </li>
        <li>
          <strong>Job data providers (Adzuna, Remotive)</strong> - to return live
          job listings that match your search.
        </li>
      </ul>

      <h2>AI-generated content</h2>
      <p>
        AI features are assistive and may produce inaccurate or generic text. You
        are responsible for reviewing and editing any AI output before using it.
        We do not guarantee any employment outcome.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We use a session cookie to keep you signed in. We also use your browser's
        local storage to save drafts and preferences on your device. We do not
        use third-party advertising cookies.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your account and content until you delete them. You can delete
        your account from Settings; this removes your account record. If you have
        an active subscription, we cancel it as part of deletion.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct,
        export, or delete your personal data. To make a request, contact us using
        the details below.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect your data, including
        encrypted connections and hashed passwords. No method of transmission or
        storage is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Children</h2>
      <p>
        The service is not intended for anyone under 16, and we do not knowingly
        collect data from children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        reflected by updating the date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data? Email us at{" "}
        <a href="mailto:support@your-domain.com">support@your-domain.com</a>{" "}
        (replace with your real support address before launch).
      </p>
    </LegalShell>
  );
}
