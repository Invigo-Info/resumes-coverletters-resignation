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

/** Strip HTML tags to test whether a letter body has real text. */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/**
 * Format a timestamp as a relative "Updated about 4 hours ago" label for the
 * card, falling back to an absolute date once a draft is over a month old.
 */
function formatUpdated(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 45) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `Updated about ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 30) return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  const d = new Date(ts);
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${d.getDate()} ${month} ${d.getFullYear()}`;
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

  // Drafts live in localStorage (client only) - avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a cover letter created/edited but never saved into the drafts
    // list still lives in the active store - surface it as a draft card here.
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

  // Only real cover letters (with an actual body) show as cards; a stray draft
  // that only carries imported personal details is not a cover letter.
  const realLetters = letters.filter((rec) => stripHtml(rec.data.letter.body));

  if (!mounted || realLetters.length === 0) {
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
      {realLetters.map((rec) => {
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
            title={rec.title}
            updatedAt={formatUpdated(rec.updatedAt)}
            data={rec.data}
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
