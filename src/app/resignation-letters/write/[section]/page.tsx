import { redirect } from "next/navigation";
import { ResignationLetterBuilder } from "@/components/resignation-letter/resignation-letter-builder";
import { isResignationSlug, RESIGNATION_FIRST_SLUG } from "@/lib/section-routes";

export default async function ResignationWritePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isResignationSlug(section)) {
    redirect(`/resignation-letters/write/${RESIGNATION_FIRST_SLUG}`);
  }
  return <ResignationLetterBuilder routedStep={section} />;
}
