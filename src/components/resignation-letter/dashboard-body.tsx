"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, RotateCcw, ChevronRight } from "lucide-react";
import { ResignationLetterCard } from "@/components/resignation-letter/resignation-letter-card";
import { useResignationLetterStore } from "@/lib/store/resignation-letter-store";
import type { ResignationLetterDoc } from "@/lib/resignation-letter/mock-data";

export function ResignationDashboardBody({ initialDocs }: { initialDocs: ResignationLetterDoc[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);

  // Draft detection — only after mount (persisted store is hydrated client-side).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hasBody = useResignationLetterStore((s) => s.letter.body.trim().length > 0);
  const step = useResignationLetterStore((s) => s.step);
  const managerName = useResignationLetterStore((s) => s.employer.managerName);
  const position = useResignationLetterStore((s) => s.position);
  const reset = useResignationLetterStore((s) => s.reset);
  // "Started" = progressed beyond the prefilled first step.
  const hasDraft = mounted && (hasBody || step !== "heading" || !!managerName || !!position);

  function continueDraft() {
    router.push(hasBody ? "/resignation-letter/preview" : "/resignation-letter/builder");
  }

  function createNew() {
    reset();
    router.push("/resignation-letter/builder");
  }

  function copyDoc(id: string) {
    setDocs((list) => {
      const i = list.findIndex((d) => d.id === id);
      if (i < 0) return list;
      const src = list[i];
      const copy: ResignationLetterDoc = {
        ...src,
        id: `copy-${id}-${list.length}`,
        title: `${src.title} (Copy)`,
        updatedAt: "Updated just now",
      };
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
    });
  }

  function deleteDoc(id: string) {
    setDocs((list) => list.filter((d) => d.id !== id));
  }

  return (
    <>
      {hasDraft && (
        <button
          type="button"
          onClick={continueDraft}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left shadow-card ring-1 ring-border transition-colors hover:ring-primary/40"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <RotateCcw className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-foreground">Continue your draft</span>
            <span className="block text-xs text-muted-foreground">Pick up where you left off</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      )}

      {docs.length > 0 ? (
        <div className="space-y-6">
          {docs.map((doc) => (
            <ResignationLetterCard
              key={doc.id}
              doc={doc}
              onCopy={() => copyDoc(doc.id)}
              onDelete={() => deleteDoc(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-border">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <FileText className="size-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-bold text-foreground">No resignation letters yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first one — it only takes a couple of minutes.
          </p>
        </div>
      )}

      {/* Create new */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={createNew}
          className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-sm font-semibold text-primary shadow-card ring-1 ring-border transition-colors hover:bg-secondary"
        >
          <Plus className="size-4" />
          Create new resignation letter
        </button>
      </div>
    </>
  );
}
