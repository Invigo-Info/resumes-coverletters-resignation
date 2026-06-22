import { redirect } from "next/navigation";
import { ResignationLetterBuilder } from "@/components/resignation-letter/resignation-letter-builder";
import { isResignationSlug, RESIGNATION_FIRST_SLUG } from "@/lib/section-routes";

/**
 * One step of the resignation-letter wizard. The [section] slug picks the step;
 * an invalid slug redirects to the first step to keep URLs shareable.
 */
export default async function ResignationWritePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  // Send unknown step slugs back to the start of the wizard.
  if (!isResignationSlug(section)) {
    redirect(`/resignation-letters/write/${RESIGNATION_FIRST_SLUG}`);
  }
  return <ResignationLetterBuilder routedStep={section} />;
}
