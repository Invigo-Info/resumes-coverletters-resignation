"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin, X } from "lucide-react";
import { LinkedInIcon } from "@/components/brand/source-icons";
import { useResumeStore } from "@/lib/store/resume-store";
import { LinkedInImportDialog } from "./linkedin-import-dialog";
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
 * pasted LinkedIn profile surfaces a banner to import from a LinkedIn PDF export.
 */
export function ContactInformationForm() {
  const contact = useResumeStore((s) => s.contact);
  const setContact = useResumeStore((s) => s.setContact);
  const contactTitle = useResumeStore((s) => s.contactTitle);
  const setContactTitle = useResumeStore((s) => s.setContactTitle);
  const importedResume = useResumeStore((s) => s.importedResume);
  const { data: session } = useSession();

  // Errors surface only after a field has been left, never mid-typing.
  const [touched, setTouched] = useState({ email: false, phone: false });
  // The LinkedIn import banner (appears once a real profile URL is entered).
  // Its button opens the PDF-import dialog; dismissing hides the banner for the
  // rest of the session. (LinkedIn blocks reading a profile from its URL, so the
  // reliable path is the profile PDF export, which the dialog parses.)
  const [importOpen, setImportOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  // The one-click import banner is only useful for a resume typed from scratch;
  // a resume that arrived via upload/import already has its details, so hide it
  // there (per the upload flow) while keeping it for the from-scratch flow.
  const showBanner = showLinkedInImport && !bannerDismissed && !importedResume;

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
              onClick={() => setImportOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <LinkedInIcon className="size-4" aria-hidden />
              Import from LinkedIn
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

      {/* Import from a LinkedIn profile PDF export. LinkedIn blocks reading a
          profile from its URL, so the reliable path is the profile PDF, which
          this dialog parses with the same extractor as the resume upload. On a
          successful import we dismiss the banner. */}
      <LinkedInImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => setBannerDismissed(true)}
      />
    </div>
  );
}
