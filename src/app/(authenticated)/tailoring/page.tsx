"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, animate } from "framer-motion";
import {
  Sparkles,
  PenLine,
  Palette,
  Share2,
  Download,
  Loader2,
  ChevronLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/utilities/utils";
import { HomeButton } from "@/components/layout/home-button";
import { HelpPill } from "@/components/layout/help-pill";
import { ShareDialog, buildShareUrl } from "@/components/share/share-dialog";
import { downloadResume } from "@/services/storage/download-pdf";
import { LivePreview } from "@/features/resume-builder/components/live-preview";
import { ScoreRing } from "@/features/jobs/components/match-scoreboard";
import { CompanyLogo } from "@/features/jobs/components/company-logo";
import { TailorArt } from "@/features/jobs/components/improve-keywords-flow";
import { useResumeStore } from "@/features/resume-builder/store/resume-store";
import { useDocumentsStore } from "@/features/resume-builder/store/documents-store";
import { useTailorStore } from "@/features/jobs/store/tailor-store";
import { canDownloadResume, recordResumeDownload } from "@/permissions/resume-download-gate";
import {
  buildTailorPlan,
  type TailorPlanItem,
  type SuggestionKind,
} from "@/features/jobs/lib/tailor-plan";
import {
  useTailoringSessionStore,
  suggestionValue,
  type SessionSuggestion,
  type SuggestionSection,
} from "@/features/jobs/store/tailoring-session-store";
import { fetchTailoringSession } from "@/features/jobs/tailoring/tailoring-sync";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Does the active resume have anything worth tailoring? */
function resumeHasContent(s: ReturnType<typeof useResumeStore.getState>): boolean {
  return Boolean(
    s.personal.firstName.trim() ||
      s.personal.lastName.trim() ||
      s.personal.jobTitle.trim() ||
      s.contact.email.trim() ||
      stripHtml(s.summary) ||
      s.employment.some((e) => e.jobTitle.trim() || e.company.trim()) ||
      s.skills.some((sk) => sk.name.trim())
  );
}

/** Escape text so it is safe to store as resume HTML. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A stable job id for session keying (same job title+company -> same session). */
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "job";

const SECTION_BY_KIND: Record<SuggestionKind, SuggestionSection> = {
  title: "job_title",
  summary: "professional_summary",
  experience: "work_experience",
  skills: "skills",
};
const FIELD_BY_KIND: Record<SuggestionKind, string> = {
  title: "personal.jobTitle",
  summary: "summary",
  experience: "employment.description",
  skills: "skills",
};

/** Convert a freshly built plan item into a durable session suggestion. */
function planItemToSuggestion(it: TailorPlanItem): SessionSuggestion {
  return {
    id: it.id,
    section: SECTION_BY_KIND[it.kind],
    kind: it.kind,
    label: it.label,
    targetResumeField:
      it.kind === "experience" && it.entryId
        ? `employment:${it.entryId}`
        : FIELD_BY_KIND[it.kind],
    scoreDelta: it.delta,
    rationale: it.guidance,
    beforeText: it.before,
    suggestedText: it.suggested,
    editedText: null,
    status: "pending",
    skillsToAdd: it.skillsToAdd,
    entryId: it.entryId,
  };
}

const CONFETTI_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#a855f7", "#ec4899"];

/* ------------------------------------------------------------------ */
/* Top bar                                                            */
/* ------------------------------------------------------------------ */

/**
 * The Tailoring-page header: Home button, the Write / Design / Tailoring stage
 * tabs (Tailoring active - Write and Design return to the editor), and the same
 * Share + Download actions as the editor.
 */
function TailoringTopBar() {
  const router = useRouter();
  const resumeId = useResumeStore((s) => s.id);
  const finalize = useTailoringSessionStore((s) => s.finalize);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    // Finalize the tailored version, then download. Free accounts may download
    // up to 3 distinct resumes; a further one needs a subscription (premium is
    // unlimited). Over the allowance -> the subscribe / Stripe checkout funnel.
    finalize();
    if (!canDownloadResume(resumeId)) {
      router.push("/payment");
      return;
    }
    setDownloading(true);
    try {
      await downloadResume();
      recordResumeDownload(resumeId);
    } finally {
      setDownloading(false);
    }
  }

  const tabBase =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4";

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4">
      <HomeButton className="size-13" />

      <div className="order-last flex w-full items-center gap-1 rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border sm:order-none sm:w-auto sm:shrink-0">
        <Link href="/builder" className={cn(tabBase, "text-muted-foreground hover:text-foreground")}>
          <span className="hidden sm:inline-flex">
            <PenLine className="size-4" />
          </span>
          Write
        </Link>
        <Link href="/builder" className={cn(tabBase, "text-muted-foreground hover:text-foreground")}>
          <span className="hidden sm:inline-flex">
            <Palette className="size-4" />
          </span>
          Design
        </Link>
        <span aria-current="page" className={cn(tabBase, "bg-foreground text-background")}>
          <span className="hidden sm:inline-flex">
            <Sparkles className="size-4" />
          </span>
          Tailoring
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-primary ring-1 ring-border transition-colors hover:bg-muted"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} shareUrl={buildShareUrl(resumeId)} label="resume" />
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">{downloading ? "Preparing" : "Download"}</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading + celebration                                              */
/* ------------------------------------------------------------------ */

/** The "Polishing your summary" generating screen shown on editor entry. */
function PolishingLoader({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <TailorArt
        art={{ strong: "#93C5FD", soft: "#DBEAFE", platform: "top", scan: true, sparkles: true }}
        reduce={reduce}
      />
      <h1 className="mt-8 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        Polishing your summary.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Every suggestion is based on your experience{" "}
        <span className="text-primary">- just better framing.</span>
      </p>
    </div>
  );
}

/** A brief confetti burst shown when tailoring completes. */
function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: 28 }).map((_, i) => {
        const left = (i * 37) % 100;
        const xDrift = ((i % 5) - 2) * 34;
        return (
          <motion.span
            key={i}
            className="absolute top-0 size-2 rounded-[2px]"
            style={{ left: `${left}%`, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
            initial={{ y: -24, opacity: 1, rotate: 0 }}
            animate={{ y: "100vh", x: xDrift, opacity: [1, 1, 0], rotate: 540 }}
            transition={{ duration: 1.5, delay: (i % 6) * 0.05, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Suggestion card                                                    */
/* ------------------------------------------------------------------ */

function DeltaBadge({ delta }: { delta: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#EAF7EE] px-2.5 py-1 text-xs font-semibold text-[#166534]">
      +{delta}%
    </span>
  );
}

/**
 * One suggestion row. Collapsed (pending) shows the label + score badge; active
 * expands to guidance, the current value, an editable proposed value, and Skip +
 * Apply/Add; resolved shows a green check (Applied) or a muted Skipped state.
 */
function SuggestionCard({
  item,
  active,
  value,
  onChange,
  onActivate,
  onApply,
  onSkip,
}: {
  item: SessionSuggestion;
  active: boolean;
  value: string;
  onChange: (v: string) => void;
  onActivate: () => void;
  onApply: () => void;
  onSkip: () => void;
}) {
  const [showBefore, setShowBefore] = useState(false);
  const status = item.status;
  const actionLabel = item.kind === "skills" ? "Add" : "Apply";

  if (status === "applied") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[#16A34A]/30 bg-[#EAF7EE] p-3.5">
        <Check className="size-4 shrink-0 text-[#16A34A]" strokeWidth={3} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{item.label}</span>
        <span className="shrink-0 text-xs font-semibold text-[#166534]">Applied</span>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">{item.label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">Skipped</span>
      </button>
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary-strong"
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{item.label}</span>
        <DeltaBadge delta={item.scoreDelta} />
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  // Active / expanded
  return (
    <div className="rounded-2xl border border-primary bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{item.label}</span>
        <DeltaBadge delta={item.scoreDelta} />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.rationale}</p>

      {/* Before value */}
      {item.kind === "skills" ? (
        <button
          type="button"
          onClick={() => setShowBefore((v) => !v)}
          aria-expanded={showBefore}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", showBefore && "rotate-180")} />
          {showBefore ? "Hide current skills" : "Show current skills"}
        </button>
      ) : (
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Before</p>
      )}
      {item.kind === "skills"
        ? showBefore && (
            <p className="mt-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{item.beforeText}</p>
          )
        : (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{item.beforeText}</p>
          )}

      {/* Suggested value (editable) */}
      <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {item.kind === "title" ? "Suggested title" : item.kind === "skills" ? "Skills to add" : "Suggested"}
      </label>
      {item.kind === "title" ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={item.kind === "skills" ? 3 : 5}
          className={cn(
            "mt-1.5 block w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary",
            item.kind === "skills" ? "border-[#16A34A]/40 bg-[#F2FBF5]" : "border-border"
          )}
        />
      )}
      {item.kind === "experience" && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">One bullet per line.</p>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!value.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#16A34A] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#15803D] disabled:opacity-50"
        >
          <Check className="size-4" strokeWidth={3} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

/**
 * The tailoring editor reached from Continue in the Tailor / Improve-keywords
 * flow. After a brief "Polishing your summary" generating screen it shows a
 * section-by-section suggestion review (job title, summary, work experience,
 * skills): each suggestion can be edited then applied (which mutates the resume,
 * updates the live preview on the right, and raises the score ring) or skipped.
 * When every suggestion is resolved the primary action becomes Download resume.
 */
export default function TailoringPage() {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;

  const jobTitle = useTailorStore((s) => s.jobTitle);
  const company = useTailorStore((s) => s.company);
  const keywords = useTailorStore((s) => s.keywords);
  const note = useTailorStore((s) => s.note);
  const baseScore = useTailorStore((s) => s.baseScore);
  const tailorResumeId = useTailorStore((s) => s.resumeId);

  const setPersonal = useResumeStore((s) => s.setPersonal);
  const setSummary = useResumeStore((s) => s.setSummary);
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const addSkill = useResumeStore((s) => s.addSkill);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const resumeId = useResumeStore((s) => s.id);

  // The durable tailoring session is the source of truth for progress (applied /
  // skipped / edited suggestions and the live score), so the flow survives the
  // /payment round-trip, share popups, and reloads - not just React state.
  const session = useTailoringSessionStore((s) => s.session);
  const ensureSession = useTailoringSessionStore((s) => s.ensureSession);
  const editSuggestion = useTailoringSessionStore((s) => s.editSuggestion);
  const applySuggestionStore = useTailoringSessionStore((s) => s.applySuggestion);
  const skipSuggestionStore = useTailoringSessionStore((s) => s.skipSuggestion);
  const applyAllStore = useTailoringSessionStore((s) => s.applyAllPending);
  const setActiveStore = useTailoringSessionStore((s) => s.setActive);
  const finalize = useTailoringSessionStore((s) => s.finalize);

  // Downloading finalizes the tailored version, then downloads. Free accounts
  // may download up to 3 distinct resumes; a further one needs a subscription
  // (premium is unlimited). Over the allowance -> the /payment funnel.
  const handleDownloadResume = () => {
    finalize();
    if (!canDownloadResume(resumeId)) {
      router.push("/payment");
      return;
    }
    void downloadResume();
    recordResumeDownload(resumeId);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Keep the shared LivePreview read-only (no editor section highlight).
  useEffect(() => {
    setActiveSection("");
  }, [setActiveSection]);

  // Entry loading -> editor.
  const [phase, setPhase] = useState<"loading" | "editor">("loading");
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setPhase("editor"), 1700);
    return () => clearTimeout(t);
  }, [mounted]);

  // Cross-device resume: before building anything, pull this job's saved session
  // from the account (if we don't already hold it locally) and seed the store, so
  // a session started on another device continues here. A no-op when logged out.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!mounted || !jobTitle) return;
    let alive = true;
    (async () => {
      const jobId = slugify(`${jobTitle}__${company}`);
      const local = useTailoringSessionStore.getState().session;
      if (!local || local.jobId !== jobId) {
        const server = await fetchTailoringSession(`tailor_${jobId}`);
        if (alive && server && server.jobId === jobId) {
          useTailoringSessionStore.setState({ session: server });
        }
      }
      if (alive) setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, [mounted, jobTitle, company]);

  // Analyze once: load the matched resume, then open (or resume) the durable
  // session for this resume+job. An existing session is reused as-is, so applied
  // or edited suggestions are never rebuilt over. Waits for hydration so a saved
  // account session is preferred over building a fresh one.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!mounted || !jobTitle || ready || !hydrated) return;

    // Make the resume being tailored the active one. The user's real resumes live
    // as saved drafts in the dashboard ("Resume section"); the active editor store
    // can instead hold leftover tailoring edits (an empty resume that only ever
    // received applied suggestions), which must never be shown in place of a real
    // uploaded resume. So a saved draft always wins:
    //   1. the resume explicitly selected in the flow (resumeId), else
    //   2. the active resume, only when it IS a saved draft with real content, else
    //   3. the most-recently-updated saved draft.
    // We fall back to the active store only when there are no saved drafts at all.
    const docs = useDocumentsStore.getState().resumes; // newest-first
    const active = useResumeStore.getState();
    const selected = tailorResumeId ? docs.find((d) => d.id === tailorResumeId) : undefined;
    const activeIsSavedDraft =
      docs.some((d) => d.id === active.id) && resumeHasContent(active);
    const target = selected ?? (activeIsSavedDraft ? undefined : docs[0]);
    if (target && target.id !== active.id) {
      loadDocument(target.id, target.data);
    }

    const rs = useResumeStore.getState();
    const jobId = slugify(`${jobTitle}__${company}`);

    // Resume an existing durable session for this resume+job without rebuilding.
    const current = useTailoringSessionStore.getState().session;
    if (current && current.resumeId === rs.id && current.jobId === jobId) {
      setReady(true);
      return;
    }

    const plan = buildTailorPlan(jobTitle, keywords, {
      jobTitle: rs.personal.jobTitle,
      summary: stripHtml(rs.summary),
      employment: rs.employment.map((e) => ({
        id: e.id,
        jobTitle: e.jobTitle,
        company: e.company,
        // Raw HTML: the plan parses the real <li> bullets to reframe them.
        description: e.description,
      })),
      skills: rs.skills.map((s) => s.name).filter(Boolean),
    });
    ensureSession({
      resumeId: rs.id,
      jobId,
      jobTitle,
      company,
      baselineScore: baseScore,
      selectedKeywords: keywords,
      userNote: note,
      suggestions: plan.map(planItemToSuggestion),
    });
    setReady(true);
  }, [
    mounted,
    hydrated,
    jobTitle,
    ready,
    keywords,
    company,
    note,
    baseScore,
    tailorResumeId,
    loadDocument,
    ensureSession,
  ]);

  const [celebrate, setCelebrate] = useState(false);

  // Animated score ring: tween the displayed number toward the session's current
  // score (or the baseline before the session exists).
  const [displayScore, setDisplayScore] = useState(0);
  const scoreRef = useRef(0);
  const currentScore = session?.currentScore ?? baseScore;
  useEffect(() => {
    const controls = animate(scoreRef.current, currentScore, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => {
        const r = Math.round(v);
        scoreRef.current = r;
        setDisplayScore(r);
      },
    });
    return () => controls.stop();
  }, [currentScore]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1800px]">
          <TailoringTopBar />
          <div className="px-4 py-16">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  // Arrived without tailoring context - guide back to Jobs.
  if (!jobTitle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1800px]">
          <TailoringTopBar />
        </div>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Nothing to tailor yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a job and choose Tailor your resume to tailor it to a role.
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Browse jobs
          </Link>
        </div>
        <HelpPill />
      </div>
    );
  }

  const items = session?.suggestions ?? [];
  const activeId = session?.activeId ?? null;
  const maxScore = session?.maxScore ?? baseScore;
  const resolved = items.filter((s) => s.status !== "pending").length;
  const allResolved = items.length > 0 && resolved === items.length;

  /** Push a suggestion's current (possibly edited) value into the resume store. */
  const applyMutation = (s: SessionSuggestion) => {
    const value = suggestionValue(s).trim();
    if (!value) return;
    if (s.kind === "title") {
      setPersonal({ jobTitle: value });
    } else if (s.kind === "summary") {
      setSummary(`<p>${esc(value)}</p>`);
    } else if (s.kind === "experience" && s.entryId) {
      const lis = value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<li>${esc(l)}</li>`)
        .join("");
      updateEmployment(s.entryId, { description: `<ul>${lis}</ul>` });
    } else if (s.kind === "skills") {
      const have = new Set(useResumeStore.getState().skills.map((sk) => sk.name.trim().toLowerCase()));
      value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((name) => {
          if (!have.has(name.toLowerCase())) {
            addSkill(name);
            have.add(name.toLowerCase());
          }
        });
    }
  };

  const fireCelebration = () => {
    if (reduce) return;
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1900);
  };

  // Celebrate once every suggestion is resolved (read fresh, post-mutation).
  const maybeCelebrate = () => {
    const sess = useTailoringSessionStore.getState().session;
    if (sess && sess.suggestions.every((x) => x.status !== "pending")) fireCelebration();
  };

  const applyItem = (s: SessionSuggestion) => {
    applyMutation(s); // the resume is only ever changed by this explicit action
    applySuggestionStore(s.id);
    maybeCelebrate();
  };

  const skipItem = (s: SessionSuggestion) => {
    skipSuggestionStore(s.id);
    maybeCelebrate();
  };

  const applyAll = () => {
    items.forEach((s) => {
      if (s.status === "pending") applyMutation(s);
    });
    applyAllStore();
    fireCelebration();
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>

      <div className="mx-auto max-w-[1800px]">
        <TailoringTopBar />

        {phase === "loading" ? (
          <PolishingLoader reduce={reduce} />
        ) : (
          <div className="flex flex-col gap-6 px-4 pb-16 lg:flex-row">
            {/* Left: tailoring sidebar */}
            <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-150 lg:self-start">
              <div className="flex max-h-[calc(100vh-6rem)] flex-col rounded-3xl bg-card p-5 shadow-card ring-1 ring-border">
                {/* Score card: company logo + "Your resume tailored to [title] at
                    [company]" + the live tailored-resume score ring. */}
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <div className="flex min-w-0 gap-3">
                    {company && (
                      <CompanyLogo
                        company={company}
                        className="size-9 rounded-lg"
                        initialClassName="text-xs"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Your resume tailored to</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {company ? `${jobTitle} at ${company}` : jobTitle}
                      </p>
                      {maxScore > displayScore && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Potential score{" "}
                          <span className="font-semibold text-[#16A34A]">{maxScore}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <ScoreRing score={displayScore} size={60} />
                </div>

                {/* Suggestions */}
                <div className="mt-5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Suggestions</h2>
                  <span className="text-xs text-muted-foreground">
                    {resolved}/{items.length} done
                  </span>
                </div>

                <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
                  {items.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      item={s}
                      active={activeId === s.id}
                      value={suggestionValue(s)}
                      onChange={(v) => editSuggestion(s.id, v)}
                      onActivate={() => setActiveStore(s.id)}
                      onApply={() => applyItem(s)}
                      onSkip={() => skipItem(s)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      Your resume already covers this job well - no suggestions needed.
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => router.push("/jobs")}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </button>
                  {allResolved || items.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleDownloadResume}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <Download className="size-4" />
                      Download resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyAll}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      Apply all suggestions
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* Right: the resume itself */}
            <section className="min-w-0 flex-1">
              <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl bg-white shadow-card-lg ring-1 ring-border">
                {/* Enlarge the preview text on the tailoring page only. LivePreview
                    is shared with the editor + PDF export and uses fixed px sizes,
                    so we zoom the wrapper and shrink its layout width by the same
                    factor - keeping it inside the card with no horizontal overflow. */}
                <div style={{ zoom: 1.5 }}>
                  <LivePreview />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      <HelpPill />
    </div>
  );
}
