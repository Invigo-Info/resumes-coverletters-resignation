import { redirect } from "next/navigation";
import { CoverLetterBuilder } from "@/components/cover-letter/cover-letter-builder";
import { isCoverLetterSlug, COVER_LETTER_FIRST_SLUG } from "@/lib/section-routes";

/**
 * One step of the cover-letter wizard. The [section] slug selects the step;
 * an invalid slug redirects to the first step so URLs stay shareable.
 */
export default async function CoverLetterWritePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  // Guard against unknown step slugs by sending users to the start of the wizard.
  if (!isCoverLetterSlug(section)) {
    redirect(`/cover-letters/write/${COVER_LETTER_FIRST_SLUG}`);
  }
  return <CoverLetterBuilder routedStep={section} />;
}
