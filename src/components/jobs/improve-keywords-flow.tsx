"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Check, MessageSquareText, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "./company-logo";

/* ------------------------------------------------------------------ */
/* Illustration                                                       */
/* ------------------------------------------------------------------ */

/** Per-stage look of the document illustration. */
export interface StageArt {
  /** Heading-line + accent colour. */
  strong: string;
  /** Body-line colour. */
  soft: string;
  /** Where the purple printer platform sits. */
  platform: "top" | "bottom";
  /** Show the round avatar block (top-right of the page). */
  avatar?: boolean;
  /** Show the faded, rotated document behind the main one. */
  backDoc?: boolean;
  /** Show the animated sparkles above the page. */
  sparkles?: boolean;
  /** Sweep a horizontal scan line down the page. */
  scan?: boolean;
}

/** A single animated 4-point sparkle at (x, y). */
function Sparkle({
  x,
  y,
  size,
  delay,
  reduce,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.path
      d="M0 -7 C 0.8 -2, 2 -0.8, 7 0 C 2 0.8, 0.8 2, 0 7 C -0.8 2, -2 0.8, -7 0 C -2 -0.8, -0.8 -2, 0 -7 Z"
      transform={`translate(${x} ${y}) scale(${size})`}
      fill="#a855f7"
      initial={{ opacity: 0.35, scale: 0.7 }}
      animate={reduce ? { opacity: 0.9 } : { opacity: [0.3, 1, 0.3], scale: [0.7, 1.1, 0.7] }}
      transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

const LINE_WIDTHS = [50, 62, 62, 44, 62, 54, 40, 58];
const STRONG_LINES = new Set([0, 3, 6]);

/**
 * The document-on-a-purple-platform illustration shown during the loading
 * sequence. The purple "printer" platform sits at the top (page feeding out) or
 * the bottom (page standing on it); content lines stagger in, and per stage a
 * scan line sweeps, sparkles pulse, an avatar block or a faded back page appears.
 */
export function TailorArt({ art, reduce }: { art: StageArt; reduce: boolean }) {
  const linesParent = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
  };
  const lineChild = {
    hidden: { opacity: 0, x: -6 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.svg
      width="240"
      height="200"
      viewBox="0 0 240 200"
      fill="none"
      aria-hidden="true"
      animate={reduce ? undefined : { y: [0, -5, 0] }}
      transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="ik-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="ik-scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c084fc" stopOpacity="0" />
          <stop offset="0.5" stopColor="#a855f7" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c084fc" stopOpacity="0" />
        </linearGradient>
        <filter id="ik-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="ik-shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1f2937" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Top platform (page prints downward out of it) */}
      {art.platform === "top" && (
        <>
          <rect x="64" y="42" width="112" height="10" rx="5" fill="url(#ik-base)" opacity="0.3" filter="url(#ik-glow)" />
          <rect x="70" y="42" width="100" height="8" rx="4" fill="url(#ik-base)" />
        </>
      )}

      {/* Faded, rotated back document */}
      {art.backDoc && (
        <g transform="rotate(12 188 108)" opacity="0.4">
          <rect x="150" y="58" width="82" height="104" rx="9" fill="#ffffff" stroke="#E7E8EB" />
          <rect x="162" y="72" width="34" height="6" rx="3" fill={art.soft} />
          <rect x="162" y="86" width="56" height="5" rx="2.5" fill="#EEF0F3" />
          <rect x="162" y="98" width="56" height="5" rx="2.5" fill="#EEF0F3" />
          <rect x="162" y="110" width="44" height="5" rx="2.5" fill="#EEF0F3" />
        </g>
      )}

      {/* Main document */}
      <g filter="url(#ik-shadow)">
        <rect x="71" y="52" width="98" height="120" rx="9" fill="#ffffff" stroke="#E7E8EB" />
      </g>

      {/* Left tick marks */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="79" y={66 + i * 14} width="6" height="5" rx="2" fill="#E5E7EB" />
      ))}

      {/* Avatar block */}
      {art.avatar && <circle cx="152" cy="70" r="9" fill={art.strong} />}

      {/* Content lines (stagger in) */}
      <motion.g variants={linesParent} initial="hidden" animate="show">
        {LINE_WIDTHS.map((w, i) => (
          <motion.rect
            key={i}
            variants={lineChild}
            x="93"
            y={66 + i * 12}
            width={w}
            height={STRONG_LINES.has(i) ? 7 : 5}
            rx={STRONG_LINES.has(i) ? 3.5 : 2.5}
            fill={STRONG_LINES.has(i) ? art.strong : art.soft}
          />
        ))}
      </motion.g>

      {/* Scan line sweeping the page */}
      {art.scan && (
        <motion.rect
          x="79"
          width="82"
          height="3"
          rx="1.5"
          fill="url(#ik-scan)"
          initial={{ y: 64 }}
          animate={reduce ? { y: 112 } : { y: [64, 158, 64] }}
          transition={reduce ? { duration: 0 } : { duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Sparkles above the page */}
      {art.sparkles && (
        <>
          <Sparkle x={122} y={30} size={1.5} delay={0} reduce={reduce} />
          <Sparkle x={150} y={40} size={1} delay={0.3} reduce={reduce} />
          <Sparkle x={98} y={42} size={0.85} delay={0.6} reduce={reduce} />
          <Sparkle x={166} y={26} size={0.6} delay={0.9} reduce={reduce} />
        </>
      )}

      {/* Bottom platform (page stands on it) */}
      {art.platform === "bottom" && (
        <>
          <rect x="46" y="173" width="148" height="11" rx="5.5" fill="url(#ik-base)" opacity="0.3" filter="url(#ik-glow)" />
          <rect x="58" y="172" width="124" height="9" rx="4.5" fill="url(#ik-base)" />
        </>
      )}
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/* Flow                                                               */
/* ------------------------------------------------------------------ */

/** The ordered loading stages, each with its title and illustration look. */
const STAGES: { key: string; title: string; art: StageArt }[] = [
  {
    key: "resume",
    title: "Checking how your resume lines up.",
    art: { strong: "#C4B5FD", soft: "#EDE9FE", platform: "top", scan: true },
  },
  {
    key: "job",
    title: "Analyzing job description.",
    art: { strong: "#6EE7B7", soft: "#A7F3D0", platform: "bottom", sparkles: true },
  },
  {
    key: "extract",
    title: "Extracting keywords.",
    art: { strong: "#C4B5FD", soft: "#EDE9FE", platform: "top", avatar: true },
  },
  {
    key: "optimize",
    title: "Optimizing for hiring systems.",
    art: { strong: "#D9DCE1", soft: "#EEF0F3", platform: "bottom", backDoc: true },
  },
];

const STAGE_MS = 1150;

/**
 * The Improve-keywords / Tailor flow launched from the job match card and the
 * Apply gateway. It plays an animated multi-stage loading sequence (checking the
 * resume, analysing the job, extracting keywords, optimising for ATS), then shows
 * the job's keywords as toggleable chips for the user to pick which apply, an
 * optional note to steer the AI, and a Continue action that hands the selection
 * to the tailoring page.
 */
export function ImproveKeywordsFlow({
  open,
  onClose,
  jobTitle,
  company,
  keywords,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  /** Company name - renders the logo + "title at company" in the header. */
  company?: string;
  keywords: string[];
  onContinue: (selected: string[], note: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<"loading" | "choose">("loading");
  const [stageIdx, setStageIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  // Every keyword starts selected; the user unchecks the ones that don't apply.
  const defaultSelected = useMemo(() => new Set(keywords), [keywords]);

  // Play the loading sequence each time the flow opens.
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setStageIdx(0);
    setSelected(new Set(defaultSelected));
    setNote("");
    setNoteOpen(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STAGES.length; i++) {
      timers.push(setTimeout(() => setStageIdx(i), STAGE_MS * i));
    }
    timers.push(setTimeout(() => setPhase("choose"), STAGE_MS * STAGES.length));
    return () => timers.forEach(clearTimeout);
  }, [open, defaultSelected]);

  // Escape closes the flow.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const stage = STAGES[stageIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tailor your resume"
      className="fixed inset-0 z-50 overflow-y-auto bg-background"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 z-10 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-5" />
      </button>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16">
        {phase === "loading" ? (
          <div className="flex flex-col items-center text-center">
            <TailorArt art={stage.art} reduce={reduce} />
            <div className="mt-8 min-h-14">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={stage.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  {stage.title}
                </motion.h1>
              </AnimatePresence>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Every suggestion is based on your experience{" "}
              <span className="text-primary">- just better framing.</span>
            </p>

            {/* Stage progress dots */}
            <div className="mt-6 flex items-center gap-2">
              {STAGES.map((s, i) => (
                <span
                  key={s.key}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === stageIdx ? "w-6 bg-primary" : i < stageIdx ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full"
          >
            {/* Job context */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {company ? (
                <CompanyLogo
                  company={company}
                  className="size-6 rounded-md"
                  initialClassName="text-[10px]"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary">
                  <FileText className="size-3.5" />
                </span>
              )}
              <span className="max-w-md truncate">
                {company ? `${jobTitle} at ${company}` : jobTitle}
              </span>
            </div>

            <h1 className="mt-3 text-center font-heading text-3xl font-extrabold tracking-tight text-foreground">
              Choose keywords to highlight
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground">
              These keywords are what this job requires. Pick the ones that apply to
              you - we&apos;ll suggest where to add them in your resume.
            </p>

            {/* Keyword chips */}
            <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-3 gap-y-4">
              {keywords.map((k) => {
                const on = selected.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    aria-pressed={on}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      on
                        ? "border border-primary bg-card text-foreground"
                        : "border border-transparent bg-secondary text-foreground hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                    )}
                  >
                    {k}
                    {on && (
                      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Guide the AI */}
            <div className="mt-10 border-t border-border pt-6">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground">Want to guide the AI?</span>
                <button
                  type="button"
                  onClick={() => setNoteOpen((v) => !v)}
                  aria-expanded={noteOpen}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                >
                  <MessageSquareText className="size-4" />
                  Add your note
                </button>
              </div>
              {noteOpen && (
                <div className="mx-auto mt-4 w-full max-w-lg">
                  <label
                    htmlFor="note-to-ai"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Note to AI
                  </label>
                  <textarea
                    id="note-to-ai"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Focus on my sales experience..."
                    className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Steers tone and emphasis. We only reframe your real experience -
                    never invent it.
                  </p>
                </div>
              )}
            </div>

            {/* Continue */}
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => onContinue([...selected], note.trim())}
                disabled={selected.size === 0}
                className="inline-flex h-12 items-center rounded-full bg-primary px-9 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
