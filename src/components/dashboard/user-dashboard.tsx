"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Mail,
  Send,
  Briefcase,
  MessageSquareText,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  fetchServerDocuments,
  type ServerDocument,
} from "@/lib/store/documents-sync";
import { fetchSavedJobs } from "@/lib/store/jobs-sync";
import {
  useDocumentsStore,
  type ResumeDocData,
} from "@/lib/store/documents-store";
import {
  useCoverLetterDocumentsStore,
  type CoverLetterDocData,
} from "@/lib/store/cover-letter-documents-store";
import {
  useResignationLetterDocumentsStore,
  type ResignationLetterDocData,
} from "@/lib/store/resignation-letter-documents-store";
import { useInterviewPrepDocumentsStore } from "@/lib/store/interview-prep-documents-store";
import { useJobsStore } from "@/lib/store/jobs-store";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store/resume-store";
import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { useResignationLetterStore } from "@/lib/store/resignation-letter-store";
import type { LucideIcon } from "lucide-react";

/** One saved thing across any category, normalised for the dashboard. */
type Kind = "resume" | "cover" | "resignation" | "job" | "interview";
interface Item {
  kind: Kind;
  id: string;
  title: string;
  updatedAt: number;
  data?: unknown;
  sub?: string;
}

const KIND_META: Record<Kind, { label: string; icon: LucideIcon }> = {
  resume: { label: "Resume", icon: FileText },
  cover: { label: "Cover letter", icon: Mail },
  resignation: { label: "Resignation letter", icon: Send },
  job: { label: "Saved job", icon: Briefcase },
  interview: { label: "Interview prep", icon: MessageSquareText },
};

/** "3 hr ago" / "5 Jun 2026" relative label. */
function formatRelative(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(diff / 3_600_000);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(diff / 86_400_000);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const dt = new Date(ts);
  return `${dt.getDate()} ${dt.toLocaleString("en-US", { month: "short" })} ${dt.getFullYear()}`;
}

/** Merge a category's local records with the server copy (newest-wins by id). */
function mergeDocs(
  local: { id: string; title: string; updatedAt: number; data: unknown }[],
  server: ServerDocument[] | undefined,
  kind: Kind
): Item[] {
  const byId = new Map<string, Item>();
  for (const r of local) {
    if (!r?.id) continue;
    byId.set(r.id, { kind, id: r.id, title: r.title, updatedAt: r.updatedAt, data: r.data });
  }
  for (const r of server ?? []) {
    if (!r?.id) continue;
    const ex = byId.get(r.id);
    if (!ex || r.updatedAt >= ex.updatedAt) {
      byId.set(r.id, { kind, id: r.id, title: r.title, updatedAt: r.updatedAt, data: r.data });
    }
  }
  return [...byId.values()];
}

/** One clickable row in a dashboard list (opens the item in its editor / view). */
function ItemRow({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const when = formatRelative(item.updatedAt);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card ring-1 ring-border transition-colors hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {item.title || "Untitled"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {meta.label}
            {item.sub ? ` · ${item.sub}` : ""}
            {when ? ` · ${when}` : ""}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

/**
 * A single overview of everything the signed-in user has stored: resumes, cover
 * letters, resignation letters, saved jobs and interview-prep sheets. Reads the
 * local stores for an instant view, then merges in the account's server copies
 * (cross-device) on mount. Each tile links to its section; each recent row opens
 * the item directly.
 */
export function UserDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Which category tile is expanded into a full list below (null = show Recent).
  const [selected, setSelected] = useState<Kind | null>(null);
  const [server, setServer] =
    useState<Awaited<ReturnType<typeof fetchServerDocuments>>>(null);
  const [jobs, setJobs] =
    useState<Awaited<ReturnType<typeof fetchSavedJobs>>>(null);

  const resumes = useDocumentsStore((s) => s.resumes);
  const coverLetters = useCoverLetterDocumentsStore((s) => s.letters);
  const resignations = useResignationLetterDocumentsStore((s) => s.letters);
  const prepSheets = useInterviewPrepDocumentsStore((s) => s.sheets);
  const savedJobsLocal = useJobsStore((s) => s.saved);

  const loadResume = useResumeStore((s) => s.loadDocument);
  const loadCover = useCoverLetterStore((s) => s.loadDocument);
  const loadResignation = useResignationLetterStore((s) => s.loadDocument);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    fetchServerDocuments().then((d) => alive && setServer(d));
    fetchSavedJobs().then((j) => alive && setJobs(j));
    return () => {
      alive = false;
    };
  }, []);

  const cats = useMemo(() => {
    const resumeItems = mergeDocs(resumes, server?.resumes, "resume");
    const coverItems = mergeDocs(coverLetters, server?.coverLetters, "cover");
    const resignationItems = mergeDocs(
      resignations,
      server?.resignationLetters,
      "resignation"
    );
    const prepItems = mergeDocs(
      prepSheets.map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        data: s.data,
      })),
      server?.interviewPrep,
      "interview"
    );

    // Saved jobs live in their own store/table (no document body). Merge the
    // local map with the server copy by job id; sort by when it was saved.
    const jobById = new Map<string, Item>();
    for (const [id, job] of Object.entries(savedJobsLocal)) {
      if (!id) continue;
      jobById.set(id, {
        kind: "job",
        id,
        title: job?.title ?? "Untitled role",
        sub: job?.company,
        updatedAt: 0,
        data: job,
      });
    }
    for (const sj of jobs ?? []) {
      const j = sj?.job;
      // Skip malformed records with no id (would collide on key "job:undefined").
      if (!j?.id) continue;
      const ex = jobById.get(j.id);
      const at = sj.savedAt ?? 0;
      if (!ex || at >= ex.updatedAt) {
        jobById.set(j.id, {
          kind: "job",
          id: j.id,
          title: j.title ?? "Untitled role",
          sub: j.company,
          updatedAt: at,
          data: j,
        });
      }
    }

    return {
      resumeItems,
      coverItems,
      resignationItems,
      prepItems,
      jobItems: [...jobById.values()],
    };
  }, [resumes, coverLetters, resignations, prepSheets, savedJobsLocal, server, jobs]);

  const sections: { kind: Kind; label: string; href: string; icon: LucideIcon; items: Item[] }[] =
    [
      { kind: "resume", label: "Resumes", href: "/", icon: FileText, items: cats.resumeItems },
      { kind: "cover", label: "Cover letters", href: "/cover-letters", icon: Mail, items: cats.coverItems },
      { kind: "resignation", label: "Resignation letters", href: "/resignation-letters", icon: Send, items: cats.resignationItems },
      { kind: "job", label: "Saved jobs", href: "/jobs", icon: Briefcase, items: cats.jobItems },
      { kind: "interview", label: "Interview prep", href: "/interview-prep/saved", icon: MessageSquareText, items: cats.prepItems },
    ];

  const recent = [
    ...cats.resumeItems,
    ...cats.coverItems,
    ...cats.resignationItems,
    ...cats.prepItems,
    ...cats.jobItems,
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);

  // When a tile is selected, show that whole category below; otherwise Recent.
  const activeSection = selected
    ? sections.find((s) => s.kind === selected) ?? null
    : null;
  const listItems = activeSection
    ? [...activeSection.items].sort((a, b) => b.updatedAt - a.updatedAt)
    : recent;

  // Open a saved item directly in the right editor / view.
  function open(item: Item) {
    switch (item.kind) {
      case "resume":
        loadResume(item.id, item.data as ResumeDocData);
        router.push("/resumes/write/personal");
        break;
      case "cover":
        loadCover(item.id, item.data as CoverLetterDocData);
        router.push("/cover-letter/preview?mode=write");
        break;
      case "resignation":
        loadResignation(item.id, item.data as ResignationLetterDocData);
        router.push("/resignation-letter/preview?mode=write");
        break;
      case "interview":
        router.push(`/interview-prep/saved/${item.id}`);
        break;
      case "job":
        router.push("/jobs?tab=saved");
        break;
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-secondary" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Your dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Everything you have created and saved, in one place.
      </p>

      {/* Category tiles: count + click to reveal that category's saved list. */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = selected === s.kind;
          return (
            <button
              key={s.kind}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSelected(isActive ? null : s.kind)}
              className={cn(
                "group rounded-2xl bg-card p-5 text-left shadow-card ring-1 transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                isActive ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40"
              )}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-3xl font-extrabold text-foreground">
                {s.items.length}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                {s.label}
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-opacity",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected category's full list, or Recent activity across everything. */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">
            {activeSection ? activeSection.label : "Recent"}
          </h2>
          {activeSection && (
            <Link
              href={activeSection.href}
              className="text-sm font-semibold text-primary hover:opacity-80"
            >
              Open section
            </Link>
          )}
        </div>

        {listItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {activeSection
                ? `No ${activeSection.label.toLowerCase()} yet.`
                : "Nothing saved yet. Create a resume or save a job and it will show up here."}
            </p>
            {!activeSection && (
              <Link
                href="/resume-creation-menu"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <Plus className="size-4" />
                Create a resume
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {listItems.map((item) => (
              <ItemRow key={`${item.kind}:${item.id}`} item={item} onOpen={open} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
