"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CoverLetterCard } from "./cover-letter-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { GhostButton } from "@/components/brand/brand-buttons";
import { useCoverLetterStore, newCoverLetterId } from "@/lib/store/cover-letter-store";
import {
  useCoverLetterDocumentsStore,
  saveActiveCoverLetter,
} from "@/lib/store/cover-letter-documents-store";

function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${day} ${month} ${d.getFullYear()}`;
}

export function DashboardCoverLetters() {
  const router = useRouter();
  const letters = useCoverLetterDocumentsStore((s) => s.letters);
  const removeLetter = useCoverLetterDocumentsStore((s) => s.removeLetter);
  const upsertLetter = useCoverLetterDocumentsStore((s) => s.upsertLetter);
  const loadDocument = useCoverLetterStore((s) => s.loadDocument);

  // Drafts live in localStorage (client only) — avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Backfill: a cover letter created/edited but never saved into the drafts
    // list still lives in the active store — surface it as a draft card here.
    saveActiveCoverLetter();
    setMounted(true);
  }, []);

  if (!mounted || letters.length === 0) {
    return (
      <EmptyState
        heading="If you don't have a cover letter yet, it's a great time to create one!"
        buttonLabel="Build my cover letter"
        href="/cover-letter/new"
      />
    );
  }

  return (
    <div className="space-y-7">
      {letters.map((rec) => {
        const open = () => {
          loadDocument(rec.id, rec.data);
          // A generated letter opens straight to the preview; otherwise resume
          // the write flow.
          const hasBody = rec.data.letter.body.trim().length > 0;
          router.push(hasBody ? "/cover-letter/preview" : "/cover-letters/write/intent");
        };
        return (
          <CoverLetterCard
            key={rec.id}
            id={rec.id}
            title={rec.title}
            updatedAt={formatUpdated(rec.updatedAt)}
            templateId={rec.templateId}
            onEdit={open}
            onDownload={open}
            onCopy={() => {
              const id = newCoverLetterId();
              upsertLetter({
                ...rec,
                id,
                title: `${rec.title} (copy)`,
                updatedAt: Date.now(),
              });
            }}
            onDelete={() => removeLetter(rec.id)}
          />
        );
      })}

      <div className="flex justify-center">
        <Link href="/cover-letter/new">
          <GhostButton className="bg-card shadow-card hover:bg-card">
            <Plus className="size-4" />
            Create new cover letter
          </GhostButton>
        </Link>
      </div>
    </div>
  );
}
