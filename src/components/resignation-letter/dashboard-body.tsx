"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PrimaryButton } from "@/components/brand/brand-buttons";
import { ResignationLetterCard } from "@/components/resignation-letter/resignation-letter-card";
import {
  useResignationLetterStore,
  newResignationLetterId,
} from "@/lib/store/resignation-letter-store";
import {
  useResignationLetterDocumentsStore,
  saveActiveResignationLetter,
  type ResignationLetterRecord,
} from "@/lib/store/resignation-letter-documents-store";
import { formatLetterDate, htmlToText, previewOpeningLine } from "@/lib/resignation-letter/format";
import type { ResignationLetterDoc } from "@/lib/resignation-letter/mock-data";

function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${day} ${month} ${d.getFullYear()}`;
}

/** Map a saved record to the card's letterhead-preview doc shape. */
function toDoc(rec: ResignationLetterRecord): ResignationLetterDoc {
  const d = rec.data;
  const recipient = [
    d.employer.managerName.trim() && `To ${d.employer.managerName.trim()}`,
    d.employer.companyName.trim(),
    d.employer.companyAddress.trim(),
  ].filter(Boolean) as string[];
  const body = htmlToText(d.letter.body).trim() || previewOpeningLine(d.lastWorkingDay);
  return {
    id: rec.id,
    title: rec.title,
    name: d.fullName.trim() || "Your Name",
    updatedAt: formatUpdated(rec.updatedAt),
    theme: d.design.theme,
    preview: {
      date: formatLetterDate(d.submissionDate) || "",
      recipient: recipient.length ? recipient : undefined,
      body,
      email: d.contacts.email.trim(),
    },
  };
}

export function ResignationDashboardBody() {
  const router = useRouter();
  const letters = useResignationLetterDocumentsStore((s) => s.letters);
  const removeLetter = useResignationLetterDocumentsStore((s) => s.removeLetter);
  const upsertLetter = useResignationLetterDocumentsStore((s) => s.upsertLetter);
  const loadDocument = useResignationLetterStore((s) => s.loadDocument);
  const reset = useResignationLetterStore((s) => s.reset);

  // Drafts live in localStorage (client only) — avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Backfill: a letter created/edited but never saved into the drafts list
    // still lives in the active store — surface it as a draft card here.
    saveActiveResignationLetter();
    setMounted(true);
  }, []);

  function createNew() {
    reset();
    router.push("/resignation-letters/write/heading");
  }

  function open(rec: ResignationLetterRecord) {
    loadDocument(rec.id, rec.data);
    const hasBody = rec.data.letter.body.trim().length > 0;
    router.push(hasBody ? "/resignation-letter/preview" : "/resignation-letters/write/heading");
  }

  if (!mounted || letters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Image
          src="/illustration.png"
          alt="Diverse professionals"
          width={544}
          height={379}
          className="w-[420px] max-w-full"
          unoptimized
          priority
        />
        <h1 className="max-w-md font-heading text-2xl font-extrabold leading-snug text-foreground">
          If you don&apos;t have a resignation letter yet, it&apos;s a great time to create one!
        </h1>
        <PrimaryButton onClick={createNew}>
          <Plus className="size-4" />
          Build my resignation letter
        </PrimaryButton>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {letters.map((rec) => (
          <ResignationLetterCard
            key={rec.id}
            doc={toDoc(rec)}
            onEdit={() => open(rec)}
            onDownload={() => open(rec)}
            onCopy={() => {
              const id = newResignationLetterId();
              upsertLetter({
                ...rec,
                id,
                title: `${rec.title} (copy)`,
                updatedAt: Date.now(),
              });
            }}
            onDelete={() => removeLetter(rec.id)}
          />
        ))}
      </div>

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
