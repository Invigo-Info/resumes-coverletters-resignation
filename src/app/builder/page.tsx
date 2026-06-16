import { redirect } from "next/navigation";
import { RESUME_FIRST_SLUG } from "@/lib/section-routes";

/**
 * Legacy entry point. The resume editor now lives at /resumes/write/<section>
 * so every write step has its own shareable URL. Preserve template/source so
 * deep links (template gallery, upload flow) keep working.
 */
export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; source?: string }>;
}) {
  const { template, source } = await searchParams;
  const qs = new URLSearchParams();
  if (template) qs.set("template", template);
  if (source) qs.set("source", source);
  const query = qs.toString();
  redirect(`/resumes/write/${RESUME_FIRST_SLUG}${query ? `?${query}` : ""}`);
}
