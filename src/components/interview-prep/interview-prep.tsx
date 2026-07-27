"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  UserRound,
  Wrench,
  MoreHorizontal,
  Loader2,
  Download,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Smile,
  Sparkles,
  Check,
  Globe,
  ExternalLink,
} from "lucide-react";
import { CompanyLogo } from "@/components/jobs/company-logo";
import { PrepResumeUpload } from "@/components/interview-prep/prep-resume-upload";
import { cn } from "@/lib/utils";
import { useApplyStore } from "@/lib/store/apply-store";
import { useResumeStore } from "@/lib/store/resume-store";
import { useDocumentsStore } from "@/lib/store/documents-store";
import {
  useInterviewPrepDocumentsStore,
  interviewPrepId,
  interviewPrepTitle,
  type SavedInterviewPrepData,
} from "@/lib/store/interview-prep-documents-store";
import type { JobPosting } from "@/lib/jobs/job-search";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
import {
  getInterviewPrep,
  getMoreQuestions,
  INTERVIEW_TYPES,
  type InterviewType,
  type InterviewPrep,
  type PrepQuestion,
} from "@/lib/interview/interview-prep";

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const TYPE_ICON: Record<InterviewType, React.ReactNode> = {
  screening: <PhoneCall className="size-5" />,
  manager: <UserRound className="size-5" />,
  technical: <Wrench className="size-5" />,
  other: <MoreHorizontal className="size-5" />,
};

/** Each interview type has its own URL, named after the section. */
export const TYPE_ROUTE: Record<InterviewType, string> = {
  screening: "/interview-prep/screening-call",
  manager: "/interview-prep/meeting-with-a-manager",
  technical: "/interview-prep/technical",
  other: "/interview-prep/other",
};

const LOADING_COPY = [
  "Analyzing the role",
  "Reviewing your background",
  "Preparing your questions",
];

// Fixed colour sequence for the question cards, keyed by POSITION - not by the
// question's content (a hard rule in every interview spec, and matched across all
// reference screenshots): Purple, Cyan, Blue-purple, Green, Purple, Grey, Teal.
// Stops stay in the 600-800 range so white body text keeps >= 4.5:1. Beyond the
// seventh card ("Get more questions") the sequence repeats.
const Q_GRADIENTS = [
  "from-[#7E22CE] to-[#A21CAF]", // 1 Purple
  "from-[#0E7490] to-[#155E75]", // 2 Cyan
  "from-[#4F46E5] to-[#6D28D9]", // 3 Blue-purple
  "from-[#047857] to-[#065F46]", // 4 Green
  "from-[#7C3AED] to-[#6D28D9]", // 5 Purple
  "from-[#475569] to-[#334155]", // 6 Grey
  "from-[#0F766E] to-[#0D9488]", // 7 Teal
];

// Muted gradients for the "questions you get to ask" cards (green / grey / teal,
// mirroring the reference screenshots).
const CQ_GRADIENTS = [
  "from-[#047857] to-[#065F46]",
  "from-[#475569] to-[#334155]",
  "from-[#0F766E] to-[#0D9488]",
];

/** Large, centred section heading shown between cards (matches the reference). */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
      {children}
    </h2>
  );
}

/** A full-bleed gradient section with white text (values, mentions, company). */
function GradientCard({
  title,
  gradient,
  children,
}: {
  title: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-linear-to-br ${gradient} p-5 shadow-card`}>
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

/** One labelled fact in the company card (Founded / HQ / Employees). */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* --- Section-level "visual preview" streaming (reveals sections one at a time,
      each preceded by a shimmering placeholder) --------------------------------- */

const RevealCtx = createContext<{
  active: number;
  advance: (step: number) => void;
} | null>(null);

/** Drives the sequential reveal: `active` is how many sections have started. */
function StreamProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const advance = useCallback(
    (step: number) => setActive((a) => Math.max(a, step + 1)),
    []
  );
  return (
    <RevealCtx.Provider value={{ active, advance }}>{children}</RevealCtx.Provider>
  );
}

/** Shimmering rows (with dividers) shown inside a section's preview, mirroring
 *  the real content layout. `onDark` tints the bars for gradient cards. */
function SkeletonRows({ count = 4, onDark = false }: { count?: number; onDark?: boolean }) {
  const widths = ["w-3/5", "w-2/5", "w-1/2", "w-3/5", "w-2/5"];
  const bar = onDark ? "bg-white/25" : "bg-muted";
  const divide = onDark ? "border-white/15" : "border-border";
  return (
    <div className="mt-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`border-t ${divide} py-2.5 first:border-t-0 first:pt-0`}>
          <span
            className={`block h-3 ${widths[i % widths.length]} animate-pulse rounded-full ${bar}`}
          />
        </div>
      ))}
    </div>
  );
}

/** A generic card-shaped shimmer (fallback when a section has no bespoke preview). */
function SectionSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" aria-hidden>
      <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
      <SkeletonRows count={3} />
    </div>
  );
}

/** The preview skeleton for a given section, matching that section's real chrome
 *  (gradient + heading) so the placeholder reads as the same card loading in. */
function sectionSkeleton(key: string | null): React.ReactNode {
  switch (key) {
    case "gtk":
      return (
        <GradientCard title="Get to know the company" gradient="from-[#1E40AF] to-[#1D4ED8]">
          <SkeletonRows count={5} onDark />
        </GradientCard>
      );
    case "values":
      return (
        <GradientCard title="What they value in people" gradient="from-[#0F766E] to-[#047857]">
          <SkeletonRows count={4} onDark />
        </GradientCard>
      );
    case "mentions":
      return (
        <GradientCard
          title="Worth mentioning in your answers"
          gradient="from-[#4338CA] to-[#4F46E5]"
        >
          <SkeletonRows count={4} onDark />
        </GradientCard>
      );
    case "role":
      return (
        <div className="pt-10">
          <SectionHeading>Take a closer look at the role</SectionHeading>
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <span className="block h-5 w-2/5 animate-pulse rounded-full bg-muted" />
            <SkeletonRows count={2} />
          </section>
        </div>
      );
    case "questions":
      return (
        <div className="pt-10">
          <SectionHeading>Questions to think through before you go</SectionHeading>
          <div className={`mt-4 rounded-2xl bg-linear-to-br p-5 shadow-card ${Q_GRADIENTS[0]}`}>
            <span className="block h-4 w-1/2 animate-pulse rounded-full bg-white/30" />
            <SkeletonRows count={3} onDark />
          </div>
        </div>
      );
    case "candidate":
      return (
        <div className="pt-10">
          <SectionHeading>You get to ask questions too</SectionHeading>
          <div className={`mt-4 rounded-2xl bg-linear-to-br p-4 shadow-card ${CQ_GRADIENTS[0]}`}>
            <span className="block h-4 w-1/2 animate-pulse rounded-full bg-white/30" />
          </div>
        </div>
      );
    case "closing":
      return (
        <div className="pt-10">
          <SectionHeading>You&apos;ve got this!</SectionHeading>
          <div className="mt-4 rounded-2xl bg-linear-to-br from-[#1D4ED8] to-[#2563EB] p-6 shadow-card">
            <span className="mx-auto block h-5 w-1/2 animate-pulse rounded-full bg-white/30" />
            <SkeletonRows count={3} onDark />
          </div>
        </div>
      );
    case "company":
    default:
      return (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="block h-5 w-1/3 animate-pulse rounded-full bg-muted" />
            <span className="block size-12 animate-pulse rounded-xl bg-muted" />
          </div>
          <SkeletonRows count={2} />
        </section>
      );
  }
}

/** Wraps one section: when its turn comes it shows a shimmer preview, then the
 *  real content, then hands off to the next section. Slow, deliberate pacing.
 *  Outside a StreamProvider it just renders its children. */
function Reveal({
  step,
  skeleton,
  children,
}: {
  step: number;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ctx = useContext(RevealCtx);
  const [phase, setPhase] = useState<"hidden" | "preview" | "shown">(
    step === 0 ? "preview" : "hidden"
  );
  const active = ctx?.active ?? 0;
  const advance = ctx?.advance;

  useEffect(() => {
    if (!ctx || phase === "shown") return;
    if (active < step) return; // not our turn yet
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("shown");
      advance?.(step);
      return;
    }
    setPhase("preview");
    const t1 = setTimeout(() => setPhase("shown"), 260);
    const t2 = setTimeout(() => advance?.(step), 260 + 140);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, active, step]);

  if (!ctx) return <>{children}</>;
  if (phase === "hidden") return null;
  if (phase === "preview") return <>{skeleton ?? <SectionSkeleton />}</>;
  return <>{children}</>;
}

/** A shimmering "visual preview" placeholder shown while an answer line loads in
 *  (before the real text is revealed). Purely decorative. */
function SkeletonLine() {
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden>
      <span className="h-2.5 w-2/5 animate-pulse rounded-full bg-white/30" />
      <span className="h-2.5 w-1/4 animate-pulse rounded-full bg-white/20" />
    </div>
  );
}

/** One question card whose answer lines arrive with a visual preview: each line
 *  first shows a shimmering skeleton, then reveals the real text. Calls onDone
 *  once the whole answer is revealed so the parent can reveal the next card. */
function StreamCard({
  index,
  q,
  onDone,
}: {
  index: number;
  q: PrepQuestion;
  onDone: () => void;
}) {
  const gradient = Q_GRADIENTS[index % Q_GRADIENTS.length];
  const lines = useMemo(() => {
    const g = q.guidance.filter(Boolean);
    if (q.sample) g.push(q.sample);
    return g.length
      ? g
      : ["Prepare a clear, specific answer grounded in your real experience."];
  }, [q]);

  // `revealed` = number of lines already shown as text; the line at index
  // `revealed` is "arriving" - it shows the skeleton preview while `previewing`.
  const [revealed, setRevealed] = useState(0);
  const [previewing, setPreviewing] = useState(true);
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (!done.current) {
        done.current = true;
        onDone();
      }
    };
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(lines.length);
      setPreviewing(false);
      finish();
      return;
    }
    if (revealed >= lines.length) {
      setPreviewing(false);
      finish();
      return;
    }
    if (previewing) {
      // Hold the shimmer preview briefly, then swap it for the real text.
      const id = setTimeout(() => setPreviewing(false), 130);
      return () => clearTimeout(id);
    }
    // Text is showing; short pause, then start previewing the next line.
    const id = setTimeout(() => {
      setRevealed((r) => r + 1);
      setPreviewing(true);
    }, 70);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, previewing, lines]);

  return (
    <div className={`rounded-2xl bg-linear-to-br p-5 shadow-card ${gradient}`}>
      <p className="font-semibold text-white">{q.question}</p>
      <div className="mt-3">
        {lines.map((ln, i) => {
          if (i > revealed) return null;
          const arriving = i === revealed && previewing;
          return (
            <div
              key={i}
              className="border-t border-white/15 py-2 first:border-t-0 first:pt-0"
            >
              {arriving ? (
                <SkeletonLine />
              ) : (
                <p className="text-sm leading-relaxed text-white/90">{ln}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Streaming questions list: reveals one card at a time; each card's answer types
 *  in, then the next card appears. Questions added later (Get more questions)
 *  appear immediately once the first batch has finished streaming. */
function StreamingQuestions({ questions }: { questions: PrepQuestion[] }) {
  const [revealed, setRevealed] = useState(1);
  const initialCount = useRef(questions.length);
  useEffect(() => {
    if (questions.length > initialCount.current) setRevealed(questions.length);
  }, [questions.length]);
  return (
    <div className="mt-4 space-y-3">
      {questions.slice(0, revealed).map((q, i) => (
        <StreamCard
          key={i}
          index={i}
          q={q}
          onDone={() =>
            setRevealed((r) => Math.min(questions.length, Math.max(r, i + 2)))
          }
        />
      ))}
    </div>
  );
}

/** A small stylised preview of the printable report shown inside the blue
 *  "Take this page with you" card. Purely decorative (aria-hidden). */
function SheetPreview({ company, role }: { company: string; role: string }) {
  const widths = ["w-11/12", "w-10/12", "w-full", "w-9/12", "w-10/12"];
  return (
    <div
      className="rounded-xl bg-white p-3 text-left shadow-lg ring-1 ring-black/5"
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#1D4ED8] text-[10px] font-bold text-white">
          {company.trim().charAt(0).toUpperCase() || "A"}
        </span>
        <span className="truncate text-[11px] font-semibold text-slate-800">{company}</span>
      </div>
      <p className="mt-2 truncate text-[10px] font-medium text-slate-500">{role}</p>
      <div className="mt-2 space-y-1.5">
        {widths.map((w, i) => (
          <div key={i} className={`h-1.5 rounded-full bg-slate-200 ${w}`} />
        ))}
      </div>
      <div className="mt-2.5 flex gap-1">
        <span className="h-3 w-10 rounded-full bg-[#7C3AED]/25" />
        <span className="h-3 w-8 rounded-full bg-[#0E7490]/25" />
        <span className="h-3 w-9 rounded-full bg-[#047857]/25" />
      </div>
    </div>
  );
}

/** A warm, abstract two-blob illustration for the closing card (no faces, no
 *  emoji - a friendly on-brand mark echoing the reference without copying it). */
function ReadyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ip-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ip-pink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="ip-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="74" rx="92" ry="42" fill="url(#ip-glow)" />
      <path
        d="M60 106c-27 0-41-19-39-41 2-24 21-40 45-36 15 3 24 13 25 28 2 24-7 49-31 49Z"
        fill="url(#ip-pink)"
      />
      <path
        d="M128 106c27 0 43-17 41-41-2-24-21-40-45-36-15 3-25 15-25 31 0 23 5 46 29 46Z"
        fill="url(#ip-blue)"
      />
    </svg>
  );
}

// Path to the bundled hugging-characters artwork. Leave null while the asset is
// missing so no request is made (a missing file would log a 404 in dev). Once you
// add the image (e.g. public/interview-prep/ready.png), set this to that path and
// the closing section will use it; until then the inline illustration renders.
const READY_IMAGE_SRC: string | null = null;

/** Closing "you're ready" artwork. Uses the bundled image when READY_IMAGE_SRC is
 *  set; otherwise (or if it fails to load) renders the inline SVG so the section
 *  is never broken and no 404 is logged for a missing asset. */
function ReadyArt() {
  const [failed, setFailed] = useState(false);
  if (!READY_IMAGE_SRC || failed)
    return <ReadyIllustration className="mx-auto mt-6 h-28 w-auto" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={READY_IMAGE_SRC}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className="mx-auto mt-6 w-full max-w-sm rounded-2xl object-contain"
    />
  );
}

/** Turn "https://apple.com/careers" or "Apple Inc." into a clean company name. */
function cleanCompany(input: string): string {
  const s = input.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (!s) return "";
  // A domain/URL (no spaces, has a dot or slash) -> its first label, capitalized.
  if (!/\s/.test(s) && /[./]/.test(s)) {
    const root = s.split(/[/.]/).filter(Boolean)[0] ?? s;
    return root.charAt(0).toUpperCase() + root.slice(1);
  }
  return s;
}

/** Build a minimal job for the prep flow from the entered company + description. */
function makeJob(company: string, description: string, role: string): JobPosting {
  const desc = description.trim();
  const title = role.trim() || "the role";
  const co = company.trim() || "the company";
  return {
    id: `prep-${co.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    title,
    company: co,
    locationLabel: "",
    mode: "Remote and on-site",
    salaryLabel: "",
    postedLabel: "",
    matchScore: 0,
    summary: desc.split(/\n+/)[0]?.slice(0, 200) || `${title} at ${co}.`,
    responsibilities: [],
    qualifications: [],
    description: desc || undefined,
    source: "generated",
  };
}

/**
 * The entry screen ("What are you preparing for?"): choose an interview at a
 * specific company (company + optional job description), or generic practice.
 * Selecting either sets the active job, which advances the flow to the interview
 * type picker.
 */
function PrepEntry({ onDone }: { onDone: () => void }) {
  const setJob = useApplyStore((s) => s.setJob);
  const role = useResumeStore((s) => s.personal.jobTitle);
  const [companyOpen, setCompanyOpen] = useState(true);
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");

  const startSpecific = () => {
    if (!company.trim()) return;
    setJob(makeJob(cleanCompany(company), jobDesc, role));
    onDone();
  };
  const startPractice = () => {
    setJob(makeJob("your target company", "", role));
    onDone();
  };

  const fieldClass =
    "w-full rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/20";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        What are you preparing for?
      </h1>

      <div className="mt-8 space-y-4">
        {/* Interview at a specific company - expandable, open by default. */}
        <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => setCompanyOpen((v) => !v)}
            aria-expanded={companyOpen}
            className="flex w-full cursor-pointer items-center gap-4 px-6 py-5 text-left outline-none"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
              <Briefcase className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold text-foreground">
                Interview at a specific company
              </span>
              <span className="block text-sm text-muted-foreground">
                Get company insights and know what to expect
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-primary transition-transform",
                !companyOpen && "-rotate-90"
              )}
            />
          </button>

          {companyOpen && (
            <div className="space-y-5 px-6 pb-6">
              <div>
                <label
                  htmlFor="prep-company"
                  className="mb-1.5 block text-sm text-muted-foreground"
                >
                  Company website, LinkedIn, or full name
                </label>
                <input
                  id="prep-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startSpecific()}
                  placeholder="apple.com"
                  className={cn(fieldClass, "h-12 px-4")}
                />
              </div>
              <div>
                <label
                  htmlFor="prep-jd"
                  className="mb-1.5 block text-sm text-muted-foreground"
                >
                  Job description
                </label>
                <textarea
                  id="prep-jd"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={5}
                  className={cn(fieldClass, "resize-y px-4 py-3")}
                />
              </div>
              <button
                type="button"
                onClick={startSpecific}
                disabled={!company.trim()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:opacity-60 disabled:shadow-none"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Just practicing - a direct action (no configuration needed). */}
        <button
          type="button"
          onClick={startPractice}
          className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-card px-6 py-5 text-left shadow-card ring-1 ring-black/5 outline-none transition-all hover:-translate-y-0.5 hover:shadow-card-lg focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <Smile className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold text-foreground">
              Just practicing
            </span>
            <span className="block text-sm text-muted-foreground">
              Get ready for any interview
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-primary" />
        </button>
      </div>
    </div>
  );
}

/**
 * The Interview prep experience: pick an interview type for the job the user is
 * applying to, then generate a job-specific prep sheet (company context, role
 * analysis, likely questions with guidance, questions to ask, download + apply).
 */
export function InterviewPrepView({
  lockedType,
  streamQuestions = false,
  initialSaved,
}: {
  /** When set, skip the type picker and auto-generate this type once a job
   *  exists (used by the dedicated /interview-prep/<type> routes). */
  lockedType?: InterviewType;
  /** Reveal the questions section as a streaming Q&A flow (question first,
   *  then the answer types in) instead of a static list. */
  streamQuestions?: boolean;
  /** When set, re-open a previously saved sheet: skip the resume/type/generate
   *  flow and render its stored prep directly (used by /interview-prep/saved/[id]). */
  initialSaved?: SavedInterviewPrepData;
} = {}) {
  const router = useRouter();
  const storeJob = useApplyStore((s) => s.job);
  const setApplyJob = useApplyStore((s) => s.setJob);
  // A re-opened sheet carries its own job; otherwise use the active apply job.
  const job = initialSaved ? initialSaved.job : storeJob;
  const hasResume = useDocumentsStore((s) => s.resumes.length > 0);
  const activeRole = useResumeStore((s) => s.personal.jobTitle);
  const activeSkills = useResumeStore((s) => s.skills);
  const activeSummary = useResumeStore((s) => s.summary);
  const activeEmployment = useResumeStore((s) => s.employment);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Re-opening a saved sheet: publish its job to the apply store so downstream
  // actions (Download, Apply) have the same context as a freshly generated sheet.
  useEffect(() => {
    if (initialSaved) setApplyJob(initialSaved.job);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [type, setType] = useState<InterviewType | null>(
    initialSaved?.interviewType ?? null
  );
  // On the main picker page the flow always begins at the "What are you preparing
  // for?" entry, regardless of any job left in the store from a previous visit;
  // it only advances once the user makes a choice there. A re-opened sheet skips
  // straight to its content.
  const [entered, setEntered] = useState(Boolean(initialSaved));
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [customText, setCustomText] = useState(initialSaved?.customDetail ?? "");
  const [prep, setPrep] = useState<InterviewPrep | null>(
    initialSaved?.prep ?? null
  );

  // Auto-save every generated (or extended) prep sheet so it survives navigation
  // and follows the account. Keyed by job + type, so regenerating updates the one
  // sheet instead of piling up duplicates. Skips the first render of a re-opened
  // sheet (it is already saved) so merely viewing it does not bump its timestamp.
  const skipInitialSave = useRef(Boolean(initialSaved));
  useEffect(() => {
    if (!prep || !job || !type) return;
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    const detail = type === "other" ? customText : undefined;
    useInterviewPrepDocumentsStore.getState().upsertSheet({
      id: interviewPrepId(job.id, type, detail),
      title: interviewPrepTitle(job, type),
      updatedAt: Date.now(),
      templateId: "",
      data: { job, interviewType: type, customDetail: detail, prep },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep, job, type]);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [copyIndex, setCopyIndex] = useState(0);
  // When true, streaming is bypassed and every section renders in full - used so
  // the print/PDF output contains all content (nothing stuck mid-stream).
  const [forceShow, setForceShow] = useState(false);

  // Any print attempt (Download button or Ctrl+P) reveals everything first.
  useEffect(() => {
    const onBeforePrint = () => setForceShow(true);
    window.addEventListener("beforeprint", onBeforePrint);
    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(
      () => setCopyIndex((i) => (i + 1) % LOADING_COPY.length),
      1400
    );
    return () => clearInterval(t);
  }, [loading]);

  const resume = useMemo<ScoreResume>(() => {
    const role =
      activeRole.trim() ||
      activeEmployment.find((e) => e.jobTitle.trim())?.jobTitle ||
      "";
    return {
      role,
      skills: activeSkills.map((s) => s.name).filter(Boolean),
      summary: stripHtml(activeSummary || ""),
      experience: activeEmployment
        .map((e) => `${e.jobTitle} ${e.company} ${stripHtml(e.description || "")}`)
        .join("\n"),
    };
  }, [activeRole, activeSkills, activeSummary, activeEmployment]);

  const generate = async (t: InterviewType, detail?: string) => {
    if (!job) return;
    setType(t);
    setLoading(true);
    setPrep(null);
    // "Just practicing" is a generic job (no real company): use the instant
    // heuristic instead of waiting 5-10s on the AI for little added value.
    const fast = (job.company ?? "").trim().toLowerCase() === "your target company";
    const p = await getInterviewPrep(job, resume, t, detail, fast);
    setPrep(p);
    setLoading(false);
    window.scrollTo({ top: 0 });
  };

  // On the dedicated /interview-prep/<type> routes, generate that type straight
  // away once a job exists - no type picker. Guarded per job so it runs once.
  // "other" is skipped here - it needs the custom-instruction step first.
  const autoGenJob = useRef<string | null>(null);
  useEffect(() => {
    if (!lockedType || lockedType === "other" || !mounted || !job) return;
    if (autoGenJob.current === job.id) return;
    autoGenJob.current = job.id;
    generate(lockedType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedType, mounted, job]);

  // Reveal every section in full, then open the print dialog on the next frame
  // so the PDF captures all content (not a half-streamed page).
  const handlePrint = () => {
    setForceShow(true);
    setTimeout(() => window.print(), 120);
  };

  const getMore = async () => {
    if (!job || !prep || !type) return;
    setMoreLoading(true);
    const more = await getMoreQuestions(
      job,
      resume,
      type,
      prep.questions.map((q) => q.question),
      type === "other" ? customText : undefined
    );
    setPrep((p) => (p ? { ...p, questions: [...p.questions, ...more] } : p));
    setMoreLoading(false);
  };

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  }

  /* ----- No resume yet (main picker page only): "Start with your resume" upload
          step. Saving a resume flips this gate and advances to the entry screen. */
  if (!lockedType && !hasResume && !initialSaved) {
    return <PrepResumeUpload />;
  }

  /* ----- The "What are you preparing for?" entry screen. On the main picker page
          (no locked type) it always shows first until the user chooses; on the
          dedicated routes it only appears as a fallback when no job exists yet. */
  if ((!lockedType && !entered) || !job) {
    return <PrepEntry onDone={() => setEntered(true)} />;
  }

  // "Just practicing" produces a generic job with no real company; its inner pages
  // skip the company/role context and start at the practice questions.
  const practice =
    (job?.company ?? "").trim().toLowerCase() === "your target company";

  /* ----- Loading (also covers the auto-generate window on locked routes,
          except "other" which asks for a custom instruction first) ----- */
  if (loading || (lockedType && lockedType !== "other" && !prep)) {
    // Just practicing goes straight to the content: no "Analyzing the role"
    // screen - instead the questions section shimmers in and then fills.
    if (practice) {
      return (
        <div className="mx-auto max-w-2xl space-y-6">
          {sectionSkeleton("questions")}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <Loader2 className="size-9 animate-spin text-primary" />
        <p className="mt-5 text-lg font-semibold text-foreground">
          {LOADING_COPY[copyIndex]}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Building prep specific to this role - just for you.
        </p>
      </div>
    );
  }

  /* ----- Other: ask for the custom instruction before generating ----- */
  if (!prep && lockedType === "other") {
    return (
      <div className="mx-auto max-w-2xl">
        {job && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{job.title}</span> at{" "}
            {job.company}
          </p>
        )}
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          What should we prepare you for?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Describe the format, topic, or skills you want to practise - we&apos;ll build
          your prep around it.
        </p>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={5}
          placeholder="e.g. A panel interview on system design, with scenario questions and sample answers"
          className="mt-6 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <div className="mt-4">
          <button
            type="button"
            disabled={!customText.trim()}
            onClick={() => generate("other", customText)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40"
          >
            Continue
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ----- Type selection ----- */
  if (!prep) {
    return (
      <div className="mx-auto max-w-2xl">
        {job && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{job.title}</span> at{" "}
            {job.company}
          </p>
        )}
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Choose your interview type
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pick the interview type so your prep is targeted, not generic.
        </p>

        <div className="mt-8 space-y-3">
          {INTERVIEW_TYPES.map((t) => {
            const isOther = t.id === "other";
            const Row = (
              <span className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tile-strong text-white">
                  {TYPE_ICON[t.id]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">
                    {t.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t.subtitle}
                  </span>
                </span>
                {isOther ? (
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-primary transition-transform",
                      !otherExpanded && "-rotate-90"
                    )}
                  />
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-primary" />
                )}
              </span>
            );

            // Screening / Manager / Technical navigate to their own URLs.
            if (!isOther) {
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => router.push(TYPE_ROUTE[t.id])}
                  className="block w-full cursor-pointer rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary-strong"
                >
                  {Row}
                </button>
              );
            }

            // Other expands in place to collect a custom instruction.
            return (
              <div
                key={t.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary-strong"
              >
                <button
                  type="button"
                  aria-expanded={otherExpanded}
                  onClick={() => setOtherExpanded((v) => !v)}
                  className="block w-full cursor-pointer"
                >
                  {Row}
                </button>
                {otherExpanded && (
                  <div className="px-5 pb-5">
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={4}
                      placeholder="Describe the format here..."
                      className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    />
                    <button
                      type="button"
                      disabled={!customText.trim()}
                      onClick={() => generate("other", customText)}
                      className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:opacity-60 disabled:shadow-none"
                    >
                      Continue
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ----- Generated prep page ----- */
  // Stream only on the dedicated routes, and never while preparing to print -
  // `forceShow` collapses the whole page to its full static form so the PDF
  // captures every section and question.
  const streaming = streamQuestions && !forceShow;

  // Each major section is built into this array so it can either render inline
  // (default) or, on the streaming routes, be revealed one at a time with a
  // shimmering "visual preview" placeholder before it.
  const sections: React.ReactNode[] = [];

  if (!practice)
    sections.push(
      /* Company card: logo, website/social, description, and known facts */
      <section key="company" className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{prep.company.name}</h2>
            {(prep.company.website || prep.company.linkedin) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {prep.company.website && (
                  <a
                    href={`https://${prep.company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="size-3.5" />
                    {prep.company.website}
                  </a>
                )}
                {prep.company.linkedin && (
                  <a
                    href={prep.company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
          <CompanyLogo company={prep.company.name} className="size-12 rounded-xl" />
        </div>
        {prep.company.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {prep.company.description}
          </p>
        )}
        {(prep.company.founded || prep.company.headquarters || prep.company.employees) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {prep.company.founded && <Metric label="Founded" value={prep.company.founded} />}
            {prep.company.headquarters && (
              <Metric label="HQ" value={prep.company.headquarters} />
            )}
            {prep.company.employees && (
              <Metric label="Employees" value={prep.company.employees} />
            )}
          </div>
        )}
      </section>
  );

  if (!practice && prep.company.bullets.length > 0)
    sections.push(
        <GradientCard key="gtk" title="Get to know the company" gradient="from-[#1E40AF] to-[#1D4ED8]">
          <ul className="space-y-2.5">
            {prep.company.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/70" />
                {b}
              </li>
            ))}
          </ul>
        </GradientCard>
    );

  if (!practice)
    sections.push(
      /* Role - standalone centred heading + plain white card (matches reference) */
      <div key="role" className="pt-10">
        <SectionHeading>Take a closer look at the role</SectionHeading>
        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-base font-bold text-foreground">{prep.role.title}</p>
          {job && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[
                job.postedLabel,
                job.salaryLabel && job.salaryLabel !== "Salary not disclosed"
                  ? job.salaryLabel
                  : null,
                job.locationLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {prep.role.summary && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {prep.role.summary}
            </p>
          )}
          {prep.role.keySkills.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Key skills to reference in your answers
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {prep.role.keySkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
  );

  if (!practice && prep.values.length > 0)
    sections.push(
        <GradientCard key="values" title="What they value in people" gradient="from-[#0F766E] to-[#047857]">
          <ul className="space-y-2.5">
            {prep.values.map((v, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <Check className="mt-0.5 size-4 shrink-0 text-white" />
                {v}
              </li>
            ))}
          </ul>
        </GradientCard>
    );

  if (!practice && prep.mentions.length > 0)
    sections.push(
        <GradientCard
          key="mentions"
          title="Worth mentioning in your answers"
          gradient="from-[#4338CA] to-[#4F46E5]"
        >
          <ul className="space-y-2.5">
            {prep.mentions.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/70" />
                {m}
              </li>
            ))}
          </ul>
        </GradientCard>
    );

  sections.push(
      /* Questions */
      <div key="questions" className="pt-10">
        <SectionHeading>Questions to think through before you go</SectionHeading>
        {streaming ? (
          <StreamingQuestions questions={prep.questions} />
        ) : (
          <div className="mt-4 space-y-3">
            {prep.questions.map((q, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-linear-to-br p-5 shadow-card ${Q_GRADIENTS[i % Q_GRADIENTS.length]}`}
              >
                <p className="font-semibold text-white">{q.question}</p>
                {q.guidance.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {q.guidance.map((g, j) => (
                      <li key={j} className="flex gap-2 text-sm text-white/90">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/60" />
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
                {q.sample && (
                  <p className="mt-3 rounded-xl bg-white/15 p-3 text-sm italic leading-relaxed text-white/90">
                    {q.sample}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-center print:hidden">
          <button
            type="button"
            onClick={getMore}
            disabled={moreLoading}
            aria-busy={moreLoading}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-6 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {moreLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating more...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Get more questions
              </>
            )}
          </button>
        </div>
      </div>
  );

  // Candidate questions - "you get to ask questions too". Omitted in Other mode
  // by default (the custom instruction is the whole blueprint - matches the spec).
  if (type !== "other" && prep.candidateQuestions.length > 0)
    sections.push(
        <div key="candidate" className="pt-10">
          <SectionHeading>You get to ask questions too</SectionHeading>
          <div className="mt-4 space-y-3">
            {prep.candidateQuestions.map((q, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-linear-to-br p-4 shadow-card ${CQ_GRADIENTS[i % CQ_GRADIENTS.length]}`}
              >
                <p className="font-semibold text-white">{q}</p>
              </div>
            ))}
          </div>
        </div>
    );

  sections.push(
      /* You've got this - closing section (matches the reference) */
      <div key="closing" className="space-y-6 pt-10 print:hidden">
        <SectionHeading>You&apos;ve got this!</SectionHeading>

        {/* Take this page with you - blue card with a printable-sheet preview */}
        <section className="overflow-hidden rounded-2xl bg-linear-to-br from-[#1D4ED8] to-[#2563EB] p-6 text-center shadow-card">
          <h3 className="text-lg font-bold text-white">Take this page with you</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/85">
            All the key points on one page - open it before you walk in.
          </p>
          <div className="relative mx-auto mt-5 w-full max-w-60">
            <span className="absolute -top-2 right-2 z-10 rounded-full bg-[#EC4899] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              Printable sheet
            </span>
            <SheetPreview company={prep.company.name} role={prep.role.title} />
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="mt-6 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#1D4ED8] shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Download className="size-4" />
            Download
          </button>
        </section>

        {/* That's it - you're ready - gradient card with illustration + Apply */}
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#7C3AED] via-[#C026D3] to-[#DB2777] p-6 text-center shadow-card">
          <h3 className="text-lg font-bold text-white">That&apos;s it - you&apos;re ready</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/85">
            You did the work. Now just show up and enjoy a good conversation - they&apos;re
            excited to meet you.
          </p>
          <button
            type="button"
            onClick={() =>
              job?.applyUrl && window.open(job.applyUrl, "_blank", "noopener,noreferrer")
            }
            disabled={!job?.applyUrl}
            className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#9333EA] shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply
            <ArrowUpRight className="size-4" />
          </button>
          <ReadyArt />
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full bg-white/15 px-5 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/25"
          >
            See more roles like this
          </button>
        </section>
      </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {/* Practice mode opens straight at the questions section, so the page title
          and the job subtitle are shown only in the company-specific flow. */}
      {!practice && (
        <>
          {job && (
            <p className="text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{job.title}</span> at{" "}
              {job.company}
            </p>
          )}
          <h1 className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything you need to ace your interview
          </h1>
        </>
      )}

      {streaming ? (
        <StreamProvider>
          {sections.map((node, i) => (
            <Reveal
              key={i}
              step={i}
              skeleton={sectionSkeleton((node as React.ReactElement).key)}
            >
              {node}
            </Reveal>
          ))}
        </StreamProvider>
      ) : (
        sections
      )}
    </div>
  );
}
