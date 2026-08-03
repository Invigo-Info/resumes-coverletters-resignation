"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, ChevronRight } from "lucide-react";
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
  type ResignationLetterDocData,
} from "@/lib/store/resignation-letter-documents-store";
import {
  fetchServerDocuments,
  pushServerDocument,
} from "@/lib/store/documents-sync";
import { formatLetterDate, htmlToText, previewOpeningLine } from "@/lib/resignation-letter/format";
import type { ResignationLetterDoc } from "@/lib/resignation-letter/mock-data";
import { cn } from "@/utilities/utils";

/** Format a timestamp as a human "Updated D Mon YYYY" label for the card. */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${day} ${month} ${d.getFullYear()}`;
}

/** Map a saved record to the card's letterhead-preview doc shape. */
function toDoc(rec: ResignationLetterRecord): ResignationLetterDoc {
  // Guard every hop: a malformed/partial record (missing employer, contacts,
  // design, etc.) must render a safe card instead of crashing the whole list.
  const d = rec.data;
  const emp = d?.employer;
  const recipient = [
    emp?.managerName?.trim() && `To ${emp.managerName.trim()}`,
    emp?.companyName?.trim(),
    emp?.companyAddress?.trim(),
  ].filter(Boolean) as string[];
  const body =
    htmlToText(d?.letter?.body ?? "").trim() ||
    previewOpeningLine(d?.lastWorkingDay ?? "");
  return {
    id: rec.id,
    title: rec.title,
    name: d?.fullName?.trim() || "Your Name",
    updatedAt: formatUpdated(rec.updatedAt),
    theme: d?.design?.theme ?? "light",
    preview: {
      date: formatLetterDate(d?.submissionDate ?? "") || "",
      recipient: recipient.length ? recipient : undefined,
      body,
      email: d?.contacts?.email?.trim() ?? "",
    },
  };
}

/**
 * Dashboard list of the user's saved resignation letters. Merges local drafts
 * with the server copy on mount, then renders a card per letter (open/copy/delete)
 * or an empty state.
 */
export function ResignationDashboardBody() {
  const router = useRouter();
  const letters = useResignationLetterDocumentsStore((s) => s.letters);
  const removeLetter = useResignationLetterDocumentsStore((s) => s.removeLetter);
  const upsertLetter = useResignationLetterDocumentsStore((s) => s.upsertLetter);
  const loadDocument = useResignationLetterStore((s) => s.loadDocument);
  const reset = useResignationLetterStore((s) => s.reset);

  // Active in-progress draft (from the persisted store): surfaced as a "Continue
  // your draft" shortcut and kept out of the saved-cards list to avoid showing
  // the same letter twice.
  const activeDraftId = useResignationLetterStore((s) => s.id);
  const draftHasBody = useResignationLetterStore((s) => s.letter.body.trim().length > 0);
  const draftStarted = useResignationLetterStore(
    (s) =>
      s.fullName.trim().length > 0 ||
      s.employer.managerName.trim().length > 0 ||
      s.employer.companyName.trim().length > 0
  );
  const draftTitle = useResignationLetterStore(
    (s) => s.employer.companyName.trim() || s.position.trim()
  );

  // Drafts live in localStorage (client only) - avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a letter created/edited but never saved into the drafts list
    // still lives in the active store - surface it as a draft card here.
    saveActiveResignationLetter();
    // Pull this user's saved resignation letters from the server, back up
    // local-only drafts, then merge them.
    (async () => {
      const server = await fetchServerDocuments();
      if (alive && server) {
        const serverIds = new Set(server.resignationLetters.map((r) => r.id));
        for (const r of useResignationLetterDocumentsStore.getState().letters) {
          if (!serverIds.has(r.id)) pushServerDocument("resignationLetters", r);
        }
        useResignationLetterDocumentsStore.setState((s) => {
          const byId = new Map(s.letters.map((r) => [r.id, r]));
          for (const rec of server.resignationLetters) {
            const existing = byId.get(rec.id);
            if (!existing || rec.updatedAt >= existing.updatedAt) {
              byId.set(rec.id, {
                id: rec.id,
                title: rec.title,
                updatedAt: rec.updatedAt,
                data: rec.data as ResignationLetterDocData,
              } satisfies ResignationLetterRecord);
            }
          }
          return {
            letters: Array.from(byId.values()).sort(
              (a, b) => b.updatedAt - a.updatedAt
            ),
          };
        });
      }
      if (alive) setMounted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function createNew() {
    reset();
    router.push("/resignation-letters/write/heading");
  }

  // Resume the active in-progress draft: open the writing editor if it has a
  // body, otherwise restart the guided flow.
  function continueDraft() {
    if (draftHasBody) router.push("/resignation-letter/preview?mode=write");
    else router.push("/resignation-letters/write/heading");
  }

  function open(rec: ResignationLetterRecord, writeMode: boolean) {
    loadDocument(rec.id, rec.data);
    const hasBody = (rec.data?.letter?.body ?? "").trim().length > 0;
    // No body yet: resume the write flow. Otherwise Edit opens the writing editor
    // (letter content); Download opens the finished Design view.
    if (!hasBody) {
      router.push("/resignation-letters/write/heading");
      return;
    }
    router.push(
      writeMode ? "/resignation-letter/preview?mode=write" : "/resignation-letter/preview"
    );
  }

  // The in-progress draft is shown as the "Continue your draft" button, so keep
  // it out of the saved-cards list below to avoid showing it twice. Cards only
  // reveal after mount (drafts are client-only), so SSR stays stable.
  const hasDraft = mounted && (draftHasBody || draftStarted);
  const cards = hasDraft ? letters.filter((rec) => rec.id !== activeDraftId) : letters;
  const hasLetters = mounted && cards.length > 0;
  const hasAny = hasDraft || hasLetters;

  return (
    <>
      {/* Continue the in-progress draft (old or new letter): a quick resume
          shortcut shown whenever the active store holds unsaved work. */}
      {hasDraft && (
        <button
          type="button"
          onClick={continueDraft}
          className="mb-8 flex w-full items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left shadow-card ring-1 ring-border transition-colors hover:ring-primary/40"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tile-strong text-white">
            <RotateCcw className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Continue your draft
            </span>
            <span className="block text-xs text-muted-foreground">
              {draftTitle
                ? `Resignation letter for ${draftTitle}`
                : "Pick up where you left off"}
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      )}

      {/* Illustration hero - always shown, matching the reference image. The
          headline stays welcoming whether or not there are saved letters. */}
      <div
        className={cn(
          "flex flex-col items-center gap-6 text-center",
          hasAny ? "pb-10" : "py-10"
        )}
      >
        <Image
          src="/illustration.png"
          alt="Diverse professionals"
          width={544}
          height={379}
          className={cn("max-w-full", hasAny ? "w-[320px]" : "w-[420px]")}
          unoptimized
          priority
        />
        <h1 className="max-w-md font-heading text-2xl font-extrabold leading-snug text-foreground">
          {hasAny
            ? "Ready to write another resignation letter?"
            : "If you don't have a resignation letter yet, it's a great time to create one!"}
        </h1>
        <PrimaryButton onClick={createNew}>
          <Plus className="size-4" />
          Build my resignation letter
        </PrimaryButton>
      </div>

      {/* Saved resignation-letter cards */}
      {hasLetters && (
        <>
          <div className="space-y-6">
            {cards.map((rec) => (
              <ResignationLetterCard
                key={rec.id}
                doc={toDoc(rec)}
                onEdit={() => open(rec, true)}
                onDownload={() => open(rec, false)}
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
      )}
    </>
  );
}
