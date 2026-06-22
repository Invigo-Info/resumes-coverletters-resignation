"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Field, SectionHeading } from "./field";

/** Editor section for the resume's contact details (email, phone, LinkedIn, location). */
export function ContactInformationForm() {
  const contact = useResumeStore((s) => s.contact);
  const setContact = useResumeStore((s) => s.setContact);

  return (
    <div>
      <SectionHeading
        title="Contact information"
        description="Add your email and phone so potential employers can easily contact you."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Email"
          type="email"
          value={contact.email}
          onChange={(v) => setContact({ email: v })}
          placeholder="john@example.com"
        />
        <Field
          label="Phone"
          value={contact.phone}
          onChange={(v) => setContact({ phone: v })}
          placeholder="999 888 7777"
        />
      </div>

      <div className="mt-5 space-y-5">
        <Field
          label="LinkedIn"
          value={contact.linkedin}
          onChange={(v) => setContact({ linkedin: v })}
          placeholder="linkedin.com/in/yourname"
        />
        <Field
          label="Location"
          value={contact.location}
          onChange={(v) => setContact({ location: v })}
          placeholder="Washington, D.C."
        />
      </div>
    </div>
  );
}
