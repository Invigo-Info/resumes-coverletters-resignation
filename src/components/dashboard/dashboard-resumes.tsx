"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ResumeCard } from "./resume-card";
import { EmptyState } from "./empty-state";
import { GhostButton } from "@/components/brand/brand-buttons";
import { usePaywall } from "@/lib/cover-letter/paywall";
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

/** Collect the resume's real experience bullets, so the AI tailoring flow can
 *  reframe them instead of inventing achievements. */
function experienceBullets(data: ResumeDocData): string[] {
  return (data.employment ?? []).flatMap((job) =>
    Array.from(job.description.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => m[1].replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
  );
}

/** Format a timestamp into the card's "Updated 5 Jun 2026, 3:45 PM" label
 *  (date + time so multiple same-day saves are distinguishable). */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Updated ${day} ${month} ${d.getFullYear()}, ${time}`;
}

/**
 * The dashboard resume list. Merges locally-stored drafts with the account's
 * server-saved resumes, renders a card per resume (with copy/delete/open), and
 * falls back to the EmptyState when there is nothing to show.
 */
export function DashboardResumes() {
  const router = useRouter();
  const premium = usePaywall((s) => s.premium);
  const resumes = useDocumentsStore((s) => s.resumes);
  const removeResume = useDocumentsStore((s) => s.removeResume);
  const upsertResume = useDocumentsStore((s) => s.upsertResume);
  const loadDocument = useResumeStore((s) => s.loadDocument);

  // Avoid SSR/client mismatch - drafts live in localStorage (client only).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a resume that was created/edited but never reached the drafts
    // list (e.g. the user navigated away before autosave fired) still lives in
    // the active resume store - surface it as a draft card here.
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
        // Download is a premium action: free users go to the subscription page;
        // premium users open THIS resume, and a sessionStorage flag tells the
        // editor to auto-export the PDF once its preview mounts - so a click on
        // the card downloads the right resume.
        const download = () => {
          if (!premium) {
            router.push("/payment");
            return;
          }
          loadDocument(rec.id, rec.data);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("resume-co:dl", "1");
          }
          router.push("/resumes/write/personal");
        };
        return (
          <ResumeCard
            key={rec.id}
            resume={doc}
            resumeBullets={experienceBullets(rec.data)}
            onEdit={open}
            onDownload={download}
            onCopy={() => {
              // Duplicate as a brand-new document (fresh id + timestamp).
              const id = newResumeId();
              upsertResume({
                ...rec,
                id,
                title: `${rec.title} (copy)`,
                updatedAt: Date.now(),
              });
              toast.success("Resume duplicated", {
                description: "Tailor the copy for a different role.",
              });
            }}
            onDelete={() => removeResume(rec.id)}
          />
        );
      })}

      {/* Secondary CTA to the "start from scratch / upload your resume" flow -
          large and noticeable, but quieter than the header's Create button. */}
      <div className="flex justify-center pt-2">
        <Link href="/resume-creation-menu">
          <GhostButton className="h-12 bg-card px-7 text-base shadow-card ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary hover:ring-primary/30">
            <Plus className="size-4" />
            Create new resume
          </GhostButton>
        </Link>
      </div>
    </div>
  );
}
