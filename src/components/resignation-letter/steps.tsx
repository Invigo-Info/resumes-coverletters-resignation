"use client";

import { useResignationLetterStore, isValidEmail } from "@/lib/store/resignation-letter-store";
import { RL_REASONS, RL_OTHER_REASON, RL_GRATITUDE } from "@/lib/resignation-letter/suggestions";
import {
  StepHeading,
  RLField,
  ChipSingleSelect,
  ChipMultiSelect,
  ChoiceButtons,
} from "./widgets";

/* --- Step 1: Heading / Full name — Step 2.png ---------------------- */
export function HeadingStep() {
  const fullName = useResignationLetterStore((s) => s.fullName);
  const setFullName = useResignationLetterStore((s) => s.setFullName);
  return (
    <div>
      <StepHeading
        title="Start with your full name"
        subtitle="Place your name at the top of the letter. This sets a clear and straightforward tone right from the start."
      />
      <RLField label="Your full name" value={fullName} onChange={setFullName} placeholder="John Mayer" autoFocus />
    </div>
  );
}

/* --- Step 2: Recipient / Employer — Step 3.png --------------------- */
export function RecipientStep() {
  const employer = useResignationLetterStore((s) => s.employer);
  const patch = useResignationLetterStore((s) => s.patchEmployer);
  return (
    <div>
      <StepHeading
        title="Provide employer's information"
        subtitle="Address your resignation letter to your immediate supervisor or manager."
      />
      <div className="space-y-5">
        <RLField
          label="Manager's name"
          value={employer.managerName}
          onChange={(v) => patch({ managerName: v })}
          placeholder="David Williams"
          autoFocus
        />
        <RLField
          label="Company name"
          value={employer.companyName}
          onChange={(v) => patch({ companyName: v })}
          placeholder="Apple Inc."
        />
        <RLField
          label="Company address (optional)"
          value={employer.companyAddress}
          onChange={(v) => patch({ companyAddress: v })}
          placeholder="500 W 2nd St, Austin, TX 78701"
        />
      </div>
    </div>
  );
}

/* --- Step 3: Position & Dates — Step 4.png ------------------------- */
export function PositionStep() {
  const salutation = useResignationLetterStore((s) => s.salutation);
  const setSalutation = useResignationLetterStore((s) => s.setSalutation);
  const position = useResignationLetterStore((s) => s.position);
  const setPosition = useResignationLetterStore((s) => s.setPosition);
  const submissionDate = useResignationLetterStore((s) => s.submissionDate);
  const setSubmissionDate = useResignationLetterStore((s) => s.setSubmissionDate);
  const lastWorkingDay = useResignationLetterStore((s) => s.lastWorkingDay);
  const setLastWorkingDay = useResignationLetterStore((s) => s.setLastWorkingDay);

  const dateError =
    submissionDate && lastWorkingDay && lastWorkingDay < submissionDate
      ? "Your last working day can't be before the submission date"
      : undefined;

  return (
    <div>
      <StepHeading
        title="Add a few crucial details"
        subtitle="State the position you're leaving and your final working day. These essential details provide clarity and help your employer make plans for the transition."
      />
      <div className="space-y-5">
        <RLField
          label="Opening salutation"
          value={salutation}
          onChange={setSalutation}
          placeholder="Dear David Williams,"
        />
        <RLField
          label="Position you are leaving"
          value={position}
          onChange={setPosition}
          placeholder="Account Manager"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RLField
            label="Letter submission date"
            value={submissionDate}
            onChange={setSubmissionDate}
            type="date"
          />
          <RLField
            label="Last working day"
            value={lastWorkingDay}
            onChange={setLastWorkingDay}
            type="date"
            error={dateError}
          />
        </div>
      </div>
    </div>
  );
}

/* --- Step 4: Reason — Step 5.png ----------------------------------- */
export function ReasonStep() {
  const reason = useResignationLetterStore((s) => s.reason);
  const setReason = useResignationLetterStore((s) => s.setReason);
  const otherReasonText = useResignationLetterStore((s) => s.otherReasonText);
  const setOtherReasonText = useResignationLetterStore((s) => s.setOtherReasonText);

  return (
    <div>
      <StepHeading
        title="Provide a reason"
        subtitle="You may briefly mention your reason for resigning, though this is optional. If you choose to include it, our AI will help keep the tone positive and professional."
      />
      <ChipSingleSelect options={RL_REASONS} value={reason} onSelect={setReason} />
      {reason === RL_OTHER_REASON && (
        <div className="mt-5 max-w-md">
          <RLField
            label="Tell us briefly"
            value={otherReasonText}
            onChange={setOtherReasonText}
            placeholder="Your reason"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

/* --- Step 5: Gratitude — Step 6.png -------------------------------- */
export function GratitudeStep() {
  const gratitude = useResignationLetterStore((s) => s.gratitude);
  const toggle = useResignationLetterStore((s) => s.toggleGratitude);
  return (
    <div>
      <StepHeading
        title="Express your gratitude"
        subtitle="In this optional paragraph, our AI can help you express gratitude for the opportunities you've been given, laying the groundwork for a positive long-term relationship."
      />
      <ChipMultiSelect options={RL_GRATITUDE} selected={gratitude} onToggle={toggle} max={3} />
    </div>
  );
}

/* --- Step 6: Assistance — Step 7.png ------------------------------- */
export function AssistanceStep() {
  const assistance = useResignationLetterStore((s) => s.assistance);
  const setAssistance = useResignationLetterStore((s) => s.setAssistance);
  return (
    <div>
      <StepHeading
        title="Offering assistance?"
        subtitle="Offering to assist with a smooth transition, such as training a replacement or completing pending projects, can leave a lasting positive impression and benefit your career in the long run."
      />
      <ChoiceButtons
        options={[
          { label: "Yes, I'd love to offer my help", emoji: "🔥", value: true },
          { label: "I am okay with skipping this point", emoji: "✌️", value: false },
        ]}
        value={assistance}
        onSelect={setAssistance}
      />
    </div>
  );
}

/* --- Step 7: Contacts — step 8.png --------------------------------- */
export function ContactsStep() {
  const contacts = useResignationLetterStore((s) => s.contacts);
  const patch = useResignationLetterStore((s) => s.patchContacts);
  const emailError =
    contacts.email.trim().length > 0 && !isValidEmail(contacts.email)
      ? "Enter a valid email address"
      : undefined;
  return (
    <div>
      <StepHeading
        title="Add contact details"
        subtitle="This step is optional. Fill in these fields only if your company requires it."
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RLField
            label="Your email"
            value={contacts.email}
            onChange={(v) => patch({ email: v })}
            placeholder="john.mayer17800@gmail.com"
            type="email"
            error={emailError}
          />
          <RLField
            label="Your phone"
            value={contacts.phone}
            onChange={(v) => patch({ phone: v })}
            placeholder="999 888 7777"
          />
        </div>
        <RLField
          label="Address"
          value={contacts.address}
          onChange={(v) => patch({ address: v })}
          placeholder="500 W 2nd St, Austin, TX 78701"
        />
      </div>
    </div>
  );
}
