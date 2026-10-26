"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Mail, BadgeCheck, Building2, Download, Briefcase, Mic } from "lucide-react";
import { CoverLetterCard } from "./cover-letter-card";
import { CoverLettersEmptyState } from "./cover-letters-empty-state";
import { GhostButton } from "@/components/common/brand/brand-buttons";
import { Button } from "@/components/common/button";
import { PageHead } from "@/components/common/page-head";
import { cn } from "@/utilities/utils";
import { useDownloadGate } from "@/permissions/resume-download-gate";
import type { LucideIcon } from "lucide-react";
import { useCoverLetterStore, newCoverLetterId } from "@/features/cover-letter/store/cover-letter-store";
import {
  useCoverLetterDocumentsStore,
  saveActiveCoverLetter,
  type CoverLetterRecord,
  type CoverLetterDocData,
} from "@/features/cover-letter/store/cover-letter-documents-store";
import {
  fetchServerDocuments,
  pushServerDocument,
} from "@/features/resume-builder/store/documents-sync";

/** Strip HTML tags to test whether a letter body has real text. */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** Real completion percent for a letter: a body baseline, plus the targeted
 *  company, the hiring manager, and a substantial body. Mirrors the editor's
 *  sense of "done" - nothing fabricated. */
function coverCompletion(data: CoverLetterDocData): number {
  let p = 45;
  const company = (
    data?.jobDetails?.companyName ||
    data?.letter?.companyName ||
    ""
  ).trim();
  const manager = (
    data?.jobDetails?.hiringManagerName ||
    data?.letter?.hiringManagerName ||
    ""
  ).trim();
  const words = stripHtml(data?.letter?.body ?? "")
    .split(/\s+/)
    .filter(Boolean).length;
  if (company) p += 14;
  if (manager) p += 15;
  if (words >= 50) p += 30;
  return Math.min(p, 100);
}

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
  const { data: session } = useSession();
  const letters = useCoverLetterDocumentsStore((s) => s.letters);
  const removeLetter = useCoverLetterDocumentsStore((s) => s.removeLetter);
  const upsertLetter = useCoverLetterDocumentsStore((s) => s.upsertLetter);
  const loadDocument = useCoverLetterStore((s) => s.loadDocument);
  const downloadedLetterIds = useDownloadGate((s) => s.downloadedIds.coverLetter);

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
  // that only carries imported personal details - or a malformed record whose
  // data.letter is missing - is not a cover letter. Guard every hop so one bad
  // record cannot crash the whole list.
  const realLetters = letters.filter((rec) => stripHtml(rec.data?.letter?.body ?? ""));

  // --- Derived, all-real dashboard metrics -------------------------------
  const firstName = (
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "there"
  ).split(" ")[0];
  const greeting = !mounted
    ? "Welcome back"
    : new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  const avgCompletion = realLetters.length
    ? Math.round(
        realLetters.reduce((a, r) => a + coverCompletion(r.data), 0) /
          realLetters.length
      )
    : 0;
  const companiesTargeted = useMemo(() => {
    const set = new Set<string>();
    for (const r of realLetters) {
      const c = (
        r.data?.jobDetails?.companyName ||
        r.data?.letter?.companyName ||
        ""
      ).trim();
      if (c) set.add(c.toLowerCase());
    }
    return set.size;
  }, [realLetters]);

  const stats: {
    value: number | string;
    label: string;
    icon: LucideIcon;
    tint: string;
  }[] = [
    {
      value: realLetters.length,
      label: realLetters.length === 1 ? "cover letter" : "cover letters",
      icon: Mail,
      tint: "bg-primary/10 text-primary",
    },
    {
      value: `${avgCompletion}%`,
      label: "average completion",
      icon: BadgeCheck,
      tint: "bg-progress-done/10 text-progress-done",
    },
    {
      value: companiesTargeted,
      label: companiesTargeted === 1 ? "company targeted" : "companies targeted",
      icon: Building2,
      tint: "bg-progress-low/10 text-progress-low",
    },
    {
      value: downloadedLetterIds.length,
      label:
        downloadedLetterIds.length === 1 ? "letter downloaded" : "letters downloaded",
      icon: Download,
      tint: "bg-ai-text/10 text-ai-text",
    },
  ];

  const continueLetters = realLetters.slice(0, 2);

  if (!mounted || realLetters.length === 0) {
    return <CoverLettersEmptyState />;
  }

  return (
    <div className="space-y-7">
      <PageHead
        eyebrow="Cover letters"
        title="Your cover letters"
        subtitle="Generate and tailor a letter to match each application."
        action={
          <Link href="/cover-letter/new">
            <Button variant="cta" className="h-10 px-5">
              <Plus className="size-4" />
              New cover letter
            </Button>
          </Link>
        }
      />

      {/* Greeting */}
      <div>
        <h2 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {realLetters.length} cover letter{realLetters.length === 1 ? "" : "s"} ·
          tailor one to each application.
        </p>
      </div>

      {/* Stat tiles - all real (counts, completion, distinct companies, downloads). */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  s.tint
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue writing - the two most recent letters. */}
      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">
          Continue writing
        </h2>
        <div className="space-y-3">
          {continueLetters.map((rec) => {
            const pct = coverCompletion(rec.data);
            const done = pct === 100;
            const cont = () => {
              loadDocument(rec.id, rec.data);
              const hasBody = (rec.data?.letter?.body ?? "").trim().length > 0;
              router.push(
                hasBody ? "/cover-letter/preview?mode=write" : "/cover-letters/write/intent"
              );
            };
            return (
              <div
                key={rec.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {rec.title || "Untitled cover letter"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          done ? "bg-progress-done" : "bg-gradient-progress"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold",
                        done ? "text-progress-done" : "text-foreground"
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cont}
                  className="inline-flex h-9 shrink-0 items-center rounded-[6px] bg-(--brand-blue) px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {done ? "Review" : "Continue"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Next best actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/cover-letter/new",
            icon: Plus,
            tint: "bg-primary/10 text-primary",
            title: "Write a new letter",
            sub: "AI guides you section by section",
          },
          {
            href: "/jobs",
            icon: Briefcase,
            tint: "bg-progress-done/10 text-progress-done",
            title: "Find a job to write for",
            sub: "Match a letter to a live posting",
          },
          {
            href: "/interview-prep",
            icon: Mic,
            tint: "bg-ai-text/10 text-ai-text",
            title: "Practice the interview",
            sub: "Questions built from your resume",
          },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              href={a.href}
              className="flex items-start gap-3.5 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border transition-colors hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  a.tint
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* All cover letters divider */}
      <div className="flex items-center gap-2.5 pt-1">
        <span className="text-base font-bold text-foreground">All cover letters</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {realLetters.length}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {realLetters.map((rec) => {
        const open = (writeMode: boolean) => {
          loadDocument(rec.id, rec.data);
          const hasBody = (rec.data?.letter?.body ?? "").trim().length > 0;
          // No body yet: resume the write flow. Otherwise Edit opens the writing
          // editor (letter content); Download opens the finished Design view.
          if (!hasBody) {
            router.push("/cover-letters/write/intent");
            return;
          }
          router.push(
            writeMode ? "/cover-letter/preview?mode=write" : "/cover-letter/preview"
          );
        };
        return (
          <CoverLetterCard
            key={rec.id}
            title={rec.title}
            updatedAt={formatUpdated(rec.updatedAt)}
            data={rec.data}
            onEdit={() => open(true)}
            onDownload={() => open(false)}
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
