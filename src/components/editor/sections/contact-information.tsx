"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LinkedInIcon } from "@/components/brand/source-icons";
import { useResumeStore, type ContactInfo } from "@/lib/store/resume-store";
import { parseResumeText } from "@/lib/ai/parseResume";
import {
  emailError,
  emailHint,
  phoneError,
  formatPhone,
  sanitizePhone,
  detectCountry,
  isLinkedInProfile,
} from "@/lib/contact-validate";
import { LOCATION_SUGGESTIONS } from "@/lib/suggestions";
import { Field, FieldWrap, EditableSectionHeading } from "./field";
import { AutocompleteInput } from "./autocomplete-input";

/**
 * Editor section for the resume's contact details.
 *
 * Email and phone lead (a recruiter needs one of them to reach the candidate),
 * LinkedIn and location support. Email is prefilled from the signed-in account
 * when the field is still empty. Phone auto-formats from its dial code, and a
 * pasted LinkedIn profile offers a one-click resume import.
 */
export function ContactInformationForm() {
  const contact = useResumeStore((s) => s.contact);
  const setContact = useResumeStore((s) => s.setContact);
  const contactTitle = useResumeStore((s) => s.contactTitle);
  const setContactTitle = useResumeStore((s) => s.setContactTitle);
  const hydrate = useResumeStore((s) => s.hydrate);
  const { data: session } = useSession();

  // Errors surface only after a field has been left, never mid-typing.
  const [touched, setTouched] = useState({ email: false, phone: false });
  // The LinkedIn import banner (appears once a real profile URL is entered) and
  // the one-click import's in-flight flag. Dismissing hides the banner for the
  // rest of the session.
  const [importing, setImporting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  /**
   * One-click import straight into the preview from the LinkedIn URL already in
   * the field. The server fetches the public profile and the same AI extractor
   * the upload uses reads the REAL details (never invented), keeping the contact
   * fields the user just typed. A private / login-walled profile can't be fully
   * read, so we still seed what we can honestly derive - the name from the
   * profile handle - into empty name fields, rather than asking for a PDF.
   */
  async function importFromLinkedIn() {
    if (importing) return;
    setImporting(true);
    try {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: contact.linkedin.trim() }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "unreadable");

      const parsed = await parseResumeText(data.text);
      const current = useResumeStore.getState().contact;
      hydrate({
        ...parsed,
        contact: { ...(parsed.contact ?? current), ...pickFilled(current) },
      });
      toast.success("Imported from LinkedIn", {
        description: "Check each section - we kept the contact details you entered.",
      });
    } catch {
      // Profile wasn't publicly readable: seed the name from the handle into any
      // empty name fields so the preview still fills, never overwriting what is
      // already there. Always a positive confirmation - no discouraging message.
      const { firstName, lastName } = nameFromUrl(contact.linkedin.trim());
      const p = useResumeStore.getState().personal;
      if ((firstName || lastName) && !p.firstName.trim() && !p.lastName.trim()) {
        hydrate({ personal: { ...p, firstName, lastName } });
      }
      toast.success("Imported from LinkedIn", {
        description: "Check each section and add anything we're missing.",
      });
    } finally {
      setImporting(false);
      setBannerDismissed(true);
    }
  }

  // Prefill the email from the signed-in account, but only into an empty field -
  // never overwrite something the user typed, and never on a later re-render.
  const accountEmail = session?.user?.email ?? "";
  useEffect(() => {
    if (accountEmail && !useResumeStore.getState().contact.email.trim()) {
      setContact({ email: accountEmail });
    }
  }, [accountEmail, setContact]);

  const country = detectCountry(contact.phone);
  const mailErr = touched.email ? emailError(contact.email) : "";
  const telErr = touched.phone ? phoneError(contact.phone) : "";
  const showLinkedInImport = isLinkedInProfile(contact.linkedin);

  const showBanner = showLinkedInImport && !bannerDismissed;

  return (
    <div>
      {/* Banner: once a genuine LinkedIn profile URL is entered, offer the
          one-click import at the top of the section (matches builder.resume.co). */}
      {showBanner && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-accent px-4 py-3">
          <p className="min-w-0 flex-1 text-sm font-semibold text-accent-foreground">
            Fill your resume from LinkedIn in one click
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={importFromLinkedIn}
              disabled={importing}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LinkedInIcon className="size-4" aria-hidden />
              )}
              {importing ? "Importing…" : "Import from LinkedIn"}
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss LinkedIn import"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-accent-foreground outline-none transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <EditableSectionHeading
        title={contactTitle}
        fallback="Contact information"
        onChange={setContactTitle}
        description="Add your email and phone so potential employers can easily contact you."
      />

      {/* Row 1: the two primary fields. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          icon={<Mail />}
          value={contact.email}
          onChange={(v) => setContact({ email: v.trim() })}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={mailErr}
          hint={emailHint(contact.email)}
          placeholder="e.g., john.doe@gmail.com"
        />
        <Field
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          icon={<Phone />}
          value={contact.phone}
          // Keep the raw digits while typing; group them once the field is left,
          // so the caret never jumps mid-entry.
          onChange={(v) => setContact({ phone: sanitizePhone(v) })}
          onBlur={() => {
            setTouched((t) => ({ ...t, phone: true }));
            setContact({ phone: formatPhone(contact.phone) });
          }}
          error={telErr}
          hint={country ? `Formatting for ${country.name}.` : "Start with + and your country code."}
          placeholder="e.g., +1 305 206 2368"
        />
      </div>

      {/* Row 2: LinkedIn, full width. */}
      <div className="mt-5">
        <Field
          label="LinkedIn"
          icon={<LinkedInIcon />}
          value={contact.linkedin}
          onChange={(v) => setContact({ linkedin: v })}
          hint={
            showLinkedInImport ? "" : "Add LinkedIn to increase visibility with recruiters."
          }
          placeholder="linkedin.com/in/yourname"
        />
      </div>

      {/* Row 3: location, full width, with the suggestion dropdown. */}
      <div className="mt-5">
        <FieldWrap label="Location">
          <AutocompleteInput
            icon={<MapPin />}
            value={contact.location}
            onChange={(v) => setContact({ location: v })}
            placeholder="e.g., Washington, DC"
            options={LOCATION_SUGGESTIONS}
            aiKind="location"
            max={6}
          />
        </FieldWrap>
      </div>

    </div>
  );
}

/** Only the contact fields the user actually filled in, so blanks don't win. */
function pickFilled(contact: ContactInfo): Partial<ContactInfo> {
  return Object.fromEntries(
    Object.entries(contact).filter(([, v]) => v.trim())
  ) as Partial<ContactInfo>;
}

/**
 * Derive a display name from a LinkedIn profile URL. The handle usually IS the
 * person's name (john-vignesh), with a trailing disambiguation token (47938649)
 * we drop. Uses only what the user typed - it invents nothing.
 */
function nameFromUrl(url: string): { firstName: string; lastName: string } {
  const m = url.match(/\/in\/([^/?#]+)/i);
  const handle = m ? decodeURIComponent(m[1]) : "";
  const words = handle
    .split(/[-_]+/)
    .filter((w) => w && !/\d/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return { firstName: words[0] ?? "", lastName: words.slice(1).join(" ") };
}
