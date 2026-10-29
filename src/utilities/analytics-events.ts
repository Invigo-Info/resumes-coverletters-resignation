/**
 * The product's analytics event catalogue.
 *
 * Every `capture()` call names an event from here rather than passing a string
 * literal. Event names are a schema: once dashboards and funnels are built on
 * them, a typo or a renamed-at-one-call-site event silently splits a metric in
 * two, and the damage is only visible weeks later when someone asks why signups
 * dropped. A single exported object makes a rename a type error instead.
 *
 * Naming: `object_pastTenseVerb`, lower snake case - PostHog's own convention,
 * so these sort together with its built-in `$pageview` / `$pageleave`.
 *
 * WHAT MUST NEVER BE A PROPERTY: resume content, employer names, job titles,
 * email addresses, the text of anything a user wrote, or any AI prompt or
 * completion. This is a resume product - the content IS the sensitive data, and
 * a job hunt is something users have a strong interest in keeping private.
 * Properties here are counts, ids, enum-like choices and booleans only.
 */
export const EVENTS = {
  /* --- account lifecycle ------------------------------------------------- */
  signedUp: "user_signed_up",
  signedIn: "user_signed_in",
  signedOut: "user_signed_out",

  /* --- the core creation funnel ----------------------------------------- */
  resumeCreated: "resume_created",
  resumeImported: "resume_imported",
  coverLetterCreated: "cover_letter_created",
  resignationLetterCreated: "resignation_letter_created",

  /* --- the money funnel -------------------------------------------------- */
  // Fired when an export is refused for want of a subscription. This is the
  // single most useful event in the product: it is the exact moment the paywall
  // bites, and the denominator for every conversion question worth asking.
  exportBlocked: "export_blocked",
  checkoutStarted: "checkout_started",
  checkoutCompleted: "checkout_completed",
  billingPortalOpened: "billing_portal_opened",

  /* --- what users actually got out of it -------------------------------- */
  documentExported: "document_exported",
  aiAssistUsed: "ai_assist_used",
  jobTailoringStarted: "job_tailoring_started",
  interviewPrepGenerated: "interview_prep_generated",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
