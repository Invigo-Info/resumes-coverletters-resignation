import { SectionHeading } from "./field";

/** Temporary stand-in for sections built in later phases (6–8). */
export function PlaceholderForm({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <SectionHeading title={title} description={description} />
      <div className="rounded-xl border border-dashed border-border bg-muted/40 px-5 py-10 text-center text-sm text-muted-foreground">
        This section's form is built in {phase}. Your entries already render in
        the live preview.
      </div>
    </div>
  );
}
