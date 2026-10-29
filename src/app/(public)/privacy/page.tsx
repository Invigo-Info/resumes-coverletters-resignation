import type { Metadata } from "next";
import { LegalShell } from "@/components/common/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Resumewriter.ai collects, uses, and protects your information.",
};

/**
 * Privacy Policy - reflects the app's actual data practices: Supabase for the
 * database, Google Gemini for AI, Stripe for payments, NextAuth for sign-in,
 * Resend for transactional email, Sentry for errors (PII-scrubbed), PostHog for
 * analytics (consent-gated), and no selling of data.
 *
 * Keep this in step with the code. The provider list and the cookie section are
 * statements about what the software does, so they stop being true the moment a
 * new third party is added - and an inaccurate privacy policy is a worse
 * liability than a thin one. Still must be reviewed by a lawyer before launch.
 */
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="29 October 2026">
      <p>
        This Privacy Policy explains what information Resumewriter.ai (&quot;we&quot;, &quot;us&quot;)
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
        <li>
          <strong>Resend</strong> - sending transactional email (welcome,
          receipts, password resets, address confirmation).
        </li>
        <li>
          <strong>Sentry</strong> - error monitoring, so we can find and fix
          crashes. Reports are stripped of IP addresses, cookies, request
          bodies and URL query strings before they are sent, and they never
          include your email or the contents of your documents.
        </li>
        <li>
          <strong>PostHog</strong> - product analytics, and{" "}
          <strong>only if you allow it</strong> (see Cookies below). We send
          which pages are viewed and which features are used. We never send the
          contents of your documents, the text you write, or AI prompts and
          responses. You are identified to PostHog by a one-way hash of your
          email address, not the address itself.
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
        We use no advertising cookies and no third-party tracking for marketing.
        What we do use falls into two groups.
      </p>
      <p>
        <strong>Necessary, and always on.</strong> A session cookie keeps you
        signed in. Your browser&apos;s local storage holds drafts, editor
        preferences and your cookie choice itself. Without these the service
        cannot work, so they are not optional and we do not ask about them.
      </p>
      <p>
        <strong>Analytics, and off until you allow it.</strong> Product analytics
        is optional. Nothing is loaded or stored for it, and no analytics
        request is made, until you choose &quot;Allow analytics&quot; - a choice
        we do not treat as given by default, and do not infer from your
        continuing to use the site.
      </p>
      <p>
        You can change your mind at any time using{" "}
        <strong>Cookie preferences</strong> in the footer of any page. Declining
        or withdrawing stops collection immediately and clears the identifier
        analytics had stored in your browser. Nothing about the service behaves
        differently either way.
      </p>
      <p>
        Error monitoring runs without asking, because we rely on it to keep the
        service working and secure rather than to learn about you. It is limited
        to what that purpose needs: reports carry no IP address, no cookies, no
        request contents, no URL query strings, and no identifying details about
        you.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your account and content until you delete them. You can delete
        your account from Settings. Deletion is immediate and permanent, and it
        removes every store that holds data about you: your account record, all
        resumes, cover letters, resignation letters and saved interview-prep
        sheets, your saved and dismissed jobs, your tailoring sessions, your
        subscription record and your export history. If you have an active
        subscription we cancel it first, so deletion can never leave a live
        subscription billing an account that no longer exists; if that
        cancellation fails we stop and keep the account rather than delete it.
      </p>
      <p>
        Two things necessarily survive deletion, and both sit with providers
        rather than with us. Stripe retains payment and invoice records it is
        legally required to keep for tax and accounting. If you allowed
        analytics, events already sent to PostHog are tied to a hash of your
        email and are removed on their own retention schedule - ask us and we
        will request their deletion.
      </p>
      <p>
        Password-reset and email-confirmation links are stored only as a one-way
        hash, expire within hours, and are deleted after that.
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
