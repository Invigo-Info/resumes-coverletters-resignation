"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ResumeCard } from "./resume-card";
import { EmptyState } from "./empty-state";
import { GhostButton } from "@/components/brand/brand-buttons";
import { useResumeStore, newResumeId } from "@/lib/store/resume-store";
import {
  useDocumentsStore,
  saveActiveResume,
  type ResumeRecord,
  type ResumeDocData,
} from "@/lib/store/documents-store";
import {
  fetchServerDocuments,
  pushServerDocument,
} from "@/lib/store/documents-sync";
import { getTemplate } from "@/lib/templates";
import type { ResumeDoc } from "@/lib/mock-data";

/** Format a timestamp into the card's "Updated 5 Jun 2026" label. */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `Updated ${day} ${month} ${d.getFullYear()}`;
}

/**
 * The dashboard resume list. Merges locally-stored drafts with the account's
 * server-saved resumes, renders a card per resume (with copy/delete/open), and
 * falls back to the EmptyState when there is nothing to show.
 */
export function DashboardResumes() {
  const router = useRouter();
  const resumes = useDocumentsStore((s) => s.resumes);
  const removeResume = useDocumentsStore((s) => s.removeResume);
  const upsertResume = useDocumentsStore((s) => s.upsertResume);
  const loadDocument = useResumeStore((s) => s.loadDocument);

  // Avoid SSR/client mismatch — drafts live in localStorage (client only).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a resume that was created/edited but never reached the drafts
    // list (e.g. the user navigated away before autosave fired) still lives in
    // the active resume store — surface it as a draft card here.
    saveActiveResume();
    // Pull this user's saved resumes from the server (works across devices),
    // back up any local-only drafts to the account, then merge newest-wins.
    (async () => {
      const server = await fetchServerDocuments();
      if (alive && server) {
        const serverIds = new Set(server.resumes.map((r) => r.id));
        for (const r of useDocumentsStore.getState().resumes) {
          if (!serverIds.has(r.id)) pushServerDocument("resumes", r);
        }
        useDocumentsStore.setState((s) => {
          const byId = new Map(s.resumes.map((r) => [r.id, r]));
          for (const rec of server.resumes) {
            // Newest-wins merge: server record replaces a local one only when it
            // is the same age or newer, so unsynced local edits aren't clobbered.
            const existing = byId.get(rec.id);
            if (!existing || rec.updatedAt >= existing.updatedAt) {
              byId.set(rec.id, {
                id: rec.id,
                title: rec.title,
                updatedAt: rec.updatedAt,
                templateId: rec.templateId ?? "",
                data: rec.data as ResumeDocData,
              } satisfies ResumeRecord);
            }
          }
          return {
            resumes: Array.from(byId.values()).sort(
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

  if (!mounted || resumes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-7">
      {resumes.map((rec) => {
        const doc: ResumeDoc = {
          id: rec.id,
          title: rec.title,
          updatedAt: formatUpdated(rec.updatedAt),
          thumb: getTemplate(rec.templateId)?.image ?? "/resume-thumb.svg",
        };
        const open = () => {
          loadDocument(rec.id, rec.data);
          router.push("/resumes/write/personal");
        };
        return (
          <ResumeCard
            key={rec.id}
            resume={doc}
            onEdit={open}
            onDownload={open}
            onCopy={() => {
              // Duplicate as a brand-new document (fresh id + timestamp).
              const id = newResumeId();
              upsertResume({
                ...rec,
                id,
                title: `${rec.title} (copy)`,
                updatedAt: Date.now(),
              });
            }}
            onDelete={() => removeResume(rec.id)}
          />
        );
      })}

      <div className="flex justify-center">
        <Link href="/resume-creation-menu">
          <GhostButton className="bg-card shadow-card hover:bg-card">
            <Plus className="size-4" />
            Create new resume
          </GhostButton>
        </Link>
      </div>
    </div>
  );
}
