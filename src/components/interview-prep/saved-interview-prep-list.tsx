"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import { fetchServerDocuments } from "@/lib/store/documents-sync";
import {
  useInterviewPrepDocumentsStore,
  interviewTypeLabel,
  type SavedInterviewPrepData,
  type InterviewPrepRecord,
} from "@/lib/store/interview-prep-documents-store";

/** "Updated 5 Jun 2026, 3:45 PM" label. */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Saved ${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}, ${time}`;
}

/**
 * Lists the user's saved interview-prep sheets. Merges the account's server
 * copies (cross-device) with the local store on load, then renders a card per
 * sheet that re-opens or deletes it. Shows a guiding empty state when there are
 * none.
 */
export function SavedInterviewPrepList() {
  const sheets = useInterviewPrepDocumentsStore((s) => s.sheets);
  const removeSheet = useInterviewPrepDocumentsStore((s) => s.removeSheet);
  const upsertSheet = useInterviewPrepDocumentsStore((s) => s.upsertSheet);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    let alive = true;
    (async () => {
      const server = await fetchServerDocuments();
      if (!alive || !server) return;
      const localIds = new Set(
        useInterviewPrepDocumentsStore.getState().sheets.map((r) => r.id)
      );
      for (const doc of server.interviewPrep) {
        if (localIds.has(doc.id)) continue;
        upsertSheet({
          id: doc.id,
          title: doc.title,
          updatedAt: doc.updatedAt,
          templateId: doc.templateId ?? "",
          data: doc.data as SavedInterviewPrepData,
        } satisfies InterviewPrepRecord);
      }
    })();
    return () => {
      alive = false;
    };
  }, [upsertSheet]);

  // Skip malformed records (missing data) so one bad sheet cannot crash the list.
  const ordered = [...sheets]
    .filter((s) => s.data)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (!mounted) {
    return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Saved interview prep
      </h1>
      <p className="mt-2 text-muted-foreground">
        Prep sheets you have generated. Open one to review it again or add more
        questions.
      </p>

      {ordered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-6" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            No saved prep yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Generate a prep sheet for a job and it will be saved here
            automatically, ready to reopen any time.
          </p>
          <Link
            href="/interview-prep"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Start interview prep
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {ordered.map((sheet) => (
            <li
              key={sheet.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {sheet.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {interviewTypeLabel(sheet.data.interviewType)} ·{" "}
                  {formatUpdated(sheet.updatedAt)}
                </p>
              </div>
              <Link
                href={`/interview-prep/saved/${sheet.id}`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Open
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => removeSheet(sheet.id)}
                aria-label={`Delete ${sheet.title}`}
                className="inline-grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
