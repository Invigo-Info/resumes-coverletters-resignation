"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, MessageSquareText, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Illustration                                                       */
/* ------------------------------------------------------------------ */

/**
 * The document-on-a-purple-platform illustration shown during the loading
 * states. "resume" renders grey skeleton lines (checking the resume); "job"
 * renders green lines + an avatar dot (analysing the job description).
 */
function TailorArt({ variant }: { variant: "resume" | "job" }) {
  const strong = variant === "job" ? "#6EE7B7" : "#D9DCE1";
  const soft = variant === "job" ? "#A7F3D0" : "#E9EBEF";
  return (
    <svg width="240" height="200" viewBox="0 0 240 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ik-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="ik-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="ik-shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1f2937" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Purple platform + glow */}
      <rect x="46" y="163" width="148" height="11" rx="5.5" fill="url(#ik-base)" opacity="0.3" filter="url(#ik-glow)" />
      <rect x="58" y="162" width="124" height="9" rx="4.5" fill="url(#ik-base)" />

      {/* Back document (faded, rotated) */}
      <g transform="rotate(13 182 96)" opacity="0.4">
        <rect x="150" y="46" width="84" height="108" rx="9" fill="#ffffff" stroke="#E7E8EB" />
        <rect x="162" y="60" width="34" height="6" rx="3" fill={soft} />
        <rect x="162" y="74" width="58" height="5" rx="2.5" fill="#EEF0F3" />
        <rect x="162" y="86" width="58" height="5" rx="2.5" fill="#EEF0F3" />
        <rect x="162" y="98" width="46" height="5" rx="2.5" fill="#EEF0F3" />
      </g>

      {/* Main document */}
      <g filter="url(#ik-shadow)">
        <rect x="72" y="40" width="98" height="126" rx="9" fill="#ffffff" stroke="#E7E8EB" />
      </g>
      {/* Left tick marks */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="80" y={56 + i * 15} width="6" height="5" rx="2" fill="#E5E7EB" />
      ))}
      {/* Content lines */}
      <rect x="94" y="55" width="50" height="7" rx="3.5" fill={strong} />
      <rect x="94" y="70" width="62" height="5" rx="2.5" fill={soft} />
      <rect x="94" y="82" width="62" height="5" rx="2.5" fill={soft} />
      <rect x="94" y="97" width="44" height="6" rx="3" fill={strong} />
      <rect x="94" y="110" width="62" height="5" rx="2.5" fill={soft} />
      <rect x="94" y="122" width="54" height="5" rx="2.5" fill={soft} />
      <rect x="94" y="137" width="40" height="6" rx="3" fill={strong} />
      <rect x="94" y="150" width="58" height="5" rx="2.5" fill={soft} />
      {variant === "job" && <circle cx="150" cy="60" r="9" fill="#6EE7B7" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Flow                                                               */
/* ------------------------------------------------------------------ */

const LOADING_STATES = [
  { key: "resume", title: "Checking how your resume lines up" },
  { key: "job", title: "Analyzing job description..." },
] as const;

/**
 * The Improve-keywords flow launched from the match card. First plays two loading
 * states (checking the resume, analysing the job), then shows the job's keywords
 * as toggleable chips for the user to pick which apply, an optional note to guide
 * the AI, and a Continue action that hands the selection to the tailoring step.
 */
export function ImproveKeywordsFlow({
  open,
  onClose,
  jobTitle,
  keywords,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  keywords: string[];
  onContinue: (selected: string[], note: string) => void;
}) {
  const [phase, setPhase] = useState<"loading" | "choose">("loading");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  // Default selection: most keywords on, the last few off (as in the design).
  const defaultSelected = useMemo(() => {
    const off = Math.min(4, Math.floor(keywords.length * 0.25));
    return new Set(keywords.slice(0, Math.max(1, keywords.length - off)));
  }, [keywords]);

  // Play the loading sequence each time the flow opens.
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setLoadingIdx(0);
    setSelected(new Set(defaultSelected));
    setNote("");
    setNoteOpen(false);
    const t1 = setTimeout(() => setLoadingIdx(1), 1200);
    const t2 = setTimeout(() => setPhase("choose"), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Improve keywords"
      className="fixed inset-0 z-50 overflow-y-auto bg-background"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-5" />
      </button>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16">
        {phase === "loading" ? (
          <div className="flex flex-col items-center text-center">
            <TailorArt variant={LOADING_STATES[loadingIdx].key} />
            <h1 className="mt-8 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {LOADING_STATES[loadingIdx].title}
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Every suggestion is based on your experience{" "}
              <span className="text-primary">- just better framing.</span>
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Job context */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary">
                <FileText className="size-3.5" />
              </span>
              <span className="max-w-md truncate">{jobTitle}</span>
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
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Add a note to steer the AI (optional), e.g. emphasise my ICU experience."
                  className="mx-auto mt-4 block w-full max-w-lg rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
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
          </div>
        )}
      </div>
    </div>
  );
}
