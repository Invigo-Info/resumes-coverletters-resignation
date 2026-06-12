import { EditorShell } from "@/components/editor/editor-shell";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; source?: string }>;
}) {
  const { template } = await searchParams;
  return <EditorShell templateId={template} />;
}
