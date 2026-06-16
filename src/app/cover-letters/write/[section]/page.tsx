import { redirect } from "next/navigation";
import { CoverLetterBuilder } from "@/components/cover-letter/cover-letter-builder";
import { isCoverLetterSlug, COVER_LETTER_FIRST_SLUG } from "@/lib/section-routes";

export default async function CoverLetterWritePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isCoverLetterSlug(section)) {
    redirect(`/cover-letters/write/${COVER_LETTER_FIRST_SLUG}`);
  }
  return <CoverLetterBuilder routedStep={section} />;
}
