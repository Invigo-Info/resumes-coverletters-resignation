"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";
import { fetchServerDocuments } from "@/features/resume-builder/store/documents-sync";
import {
  useInterviewPrepDocumentsStore,
  type SavedInterviewPrepData,
} from "@/features/interview-prep/store/interview-prep-documents-store";

/**
 * Re-opens a saved interview-prep sheet by id. Looks in the local store first
 * (instant on the device that saved it), then falls back to the account's server
 * copy (cross-device). Renders the stored prep via <InterviewPrepView> without
 * regenerating; shows a not-found state if the id no longer exists.
 */
export function ReopenSavedPrep({ id }: { id: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "found"; data: SavedInterviewPrepData }
    | { status: "missing" }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    // Treat a record whose data is missing its core field as corrupt/not-found,
    // so a malformed record cannot crash the prep viewer.
    const valid = (d: SavedInterviewPrepData | undefined): d is SavedInterviewPrepData =>
      !!d && !!d.interviewType;
    const local = useInterviewPrepDocumentsStore.getState().getSheet(id);
    if (local && valid(local.data)) {
      setState({ status: "found", data: local.data });
      return;
    }
    (async () => {
      const server = await fetchServerDocuments();
      if (!alive) return;
      const doc = server?.interviewPrep.find((d) => d.id === id);
      const data = doc?.data as SavedInterviewPrepData | undefined;
      setState(
        valid(data) ? { status: "found", data } : { status: "missing" }
      );
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Loading your prep...</p>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Prep sheet not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This saved prep may have been deleted or belongs to another account.
        </p>
        <Link
          href="/interview-prep/saved"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to saved prep
        </Link>
      </div>
    );
  }

  return <InterviewPrepView initialSaved={state.data} />;
}
