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
import { useResumeLimit } from "@/lib/resume-limit";
import { canDownloadResume, recordResumeDownload } from "@/lib/resume-download-gate";
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
import { downloadResume } from "@/lib/download-pdf";
import { LivePreview } from "@/components/editor/live-preview";
import { ResumeThumbnail } from "./resume-thumbnail";
import type { ResumeDoc } from "@/lib/mock-data";

/** Collect the resume's real experience bullets, so the AI tailoring flow can
 *  reframe them instead of inventing achievements. */
function experienceBullets(data: ResumeDocData): string[] {
  // Guard against a malformed/partial record (missing employment or a job's
  // description) so a bad resume record cannot crash the dashboard.
  return (data?.employment ?? []).flatMap((job) =>
    Array.from((job.description ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
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
  const { atLimit, count, limit, remaining } = useResumeLimit();
  // Free accounts past the cap go to /payment instead of the creation menu.
  const newResumeHref = atLimit ? "/payment" : "/resume-creation-menu";
  const resumes = useDocumentsStore((s) => s.resumes);
  const removeResume = useDocumentsStore((s) => s.removeResume);
  const upsertResume = useDocumentsStore((s) => s.upsertResume);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  // The card whose PDF is currently being exported (shows a spinner on it).
  const [exportingId, setExportingId] = useState<string | null>(null);

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
      {/* Off-screen PDF source for card downloads: it mirrors the active resume
          store, so the download handler loads the clicked resume into the store,
          waits a tick, then exports this node - no need to open the editor. */}
      <div aria-hidden className="hidden">
        <LivePreview previewOnly />
      </div>

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
        // Free accounts may download up to 3 distinct resumes; a further one
        // needs a subscription (premium is unlimited). Within the allowance the
        // resume is exported to a PDF right here - no navigation: the clicked
        // resume is loaded into the hidden off-screen preview below, which the
        // exporter captures.
        const download = async () => {
          if (!canDownloadResume(rec.id)) {
            router.push("/payment");
            return;
          }
          if (exportingId) return; // a download is already in flight
          loadDocument(rec.id, rec.data);
          setExportingId(rec.id);
          try {
            // Let the hidden preview commit the loaded resume, then settle fonts.
            await new Promise((r) => setTimeout(r, 80));
            try {
              await document.fonts?.ready;
            } catch {
              /* fonts API absent - proceed anyway */
            }
            await downloadResume();
            recordResumeDownload(rec.id);
          } finally {
            setExportingId(null);
          }
        };
        return (
          <ResumeCard
            key={rec.id}
            resume={doc}
            resumeBullets={experienceBullets(rec.data)}
            thumbnail={<ResumeThumbnail id={rec.id} data={rec.data} />}
            downloading={exportingId === rec.id}
            onEdit={open}
            onDownload={download}
            onCopy={() => {
              // Duplicating creates a new resume, so it hits the free-tier cap
              // too - send a capped free user to subscribe instead.
              if (atLimit) {
                router.push("/payment");
                return;
              }
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
          large and noticeable, but quieter than the header's Create button.
          Free accounts past the cap are routed to subscribe instead. */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Link href={newResumeHref}>
          <GhostButton className="h-12 bg-card px-7 text-base shadow-card ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary hover:ring-primary/30">
            <Plus className="size-4" />
            {/* Free + at the cap: subscribe. Subscribed: a positive "Build my
                resume" CTA (matches the empty state). Free under the cap: create. */}
            {atLimit
              ? "Subscribe to add more"
              : premium
                ? "Build my resume"
                : "Create new resume"}
          </GhostButton>
        </Link>
        {!premium && (
          <p className="text-xs text-muted-foreground">
            {atLimit
              ? `You have used all ${limit} free resumes.`
              : `${count} of ${limit} free resumes used${
                  remaining === 1 ? " - 1 left" : ` - ${remaining} left`
                }`}
          </p>
        )}
      </div>
    </div>
  );
}
