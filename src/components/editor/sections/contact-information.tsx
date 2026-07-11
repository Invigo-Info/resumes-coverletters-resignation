"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin, Sparkles } from "lucide-react";
import { LinkedInIcon } from "@/components/brand/source-icons";
import { useResumeStore } from "@/lib/store/resume-store";
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
import { LinkedInImportDialog } from "./linkedin-import-dialog";

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
  const { data: session } = useSession();

  // Errors surface only after a field has been left, never mid-typing.
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <div>
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

        {showLinkedInImport && (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="mt-2.5 flex w-full items-center gap-3 rounded-xl bg-[var(--ai-from)]/5 px-4 py-3 text-left ring-1 ring-[var(--ai-from)]/20 outline-none transition-colors hover:bg-[var(--ai-from)]/10 focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Sparkles className="size-4 shrink-0 text-[var(--ai-from)]" />
            <span className="flex-1 text-sm font-semibold text-foreground">
              Fill your resume from LinkedIn in one click
            </span>
            <span className="text-sm font-semibold text-[var(--ai-from)]">Import</span>
          </button>
        )}
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

      <LinkedInImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
