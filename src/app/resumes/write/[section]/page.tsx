import { redirect } from "next/navigation";
import { EditorShell } from "@/components/editor/editor-shell";
import { resumeKeyFromSlug, RESUME_FIRST_SLUG } from "@/lib/section-routes";

/**
 * Resume editor for one write step. The [section] slug selects which part of the
 * resume is being edited; an unknown slug redirects to the first step. The
 * optional ?template carries the chosen template into the editor.
 */
export default async function ResumeWritePage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ template?: string; source?: string }>;
}) {
  const { section } = await params;
  const { template } = await searchParams;

  // Unknown slug -> start of the flow.
  if (!resumeKeyFromSlug(section)) {
    redirect(`/resumes/write/${RESUME_FIRST_SLUG}`);
  }

  return <EditorShell templateId={template} routedSection={section} />;
}
