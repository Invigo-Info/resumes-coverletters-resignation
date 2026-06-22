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
  type CoverLetterRecord,
  type CoverLetterDocData,
} from "@/lib/store/cover-letter-documents-store";
import {
  fetchServerDocuments,
  pushServerDocument,
} from "@/lib/store/documents-sync";

/** Format a timestamp as a human "Updated D Mon YYYY" label for the card. */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${day} ${month} ${d.getFullYear()}`;
}

/**
 * Dashboard list of the user's saved cover letters. Merges local drafts with the
 * server copy on mount, then renders a card per letter (with open/copy/delete) or
 * an empty state.
 */
export function DashboardCoverLetters() {
  const router = useRouter();
  const letters = useCoverLetterDocumentsStore((s) => s.letters);
  const removeLetter = useCoverLetterDocumentsStore((s) => s.removeLetter);
  const upsertLetter = useCoverLetterDocumentsStore((s) => s.upsertLetter);
  const loadDocument = useCoverLetterStore((s) => s.loadDocument);

  // Drafts live in localStorage (client only) — avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a cover letter created/edited but never saved into the drafts
    // list still lives in the active store — surface it as a draft card here.
    saveActiveCoverLetter();
    // Pull this user's saved cover letters from the server, back up local-only
    // drafts, then merge them in.
    (async () => {
      const server = await fetchServerDocuments();
      if (alive && server) {
        const serverIds = new Set(server.coverLetters.map((r) => r.id));
        for (const r of useCoverLetterDocumentsStore.getState().letters) {
          if (!serverIds.has(r.id)) pushServerDocument("coverLetters", r);
        }
        useCoverLetterDocumentsStore.setState((s) => {
          const byId = new Map(s.letters.map((r) => [r.id, r]));
          for (const rec of server.coverLetters) {
            const existing = byId.get(rec.id);
            if (!existing || rec.updatedAt >= existing.updatedAt) {
              byId.set(rec.id, {
                id: rec.id,
                title: rec.title,
                updatedAt: rec.updatedAt,
                templateId: rec.templateId ?? "",
                data: rec.data as CoverLetterDocData,
              } satisfies CoverLetterRecord);
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
