"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  WandSparkles,
  TriangleAlert,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeStore, type ResumeState } from "@/features/resume-builder/store/resume-store";
import { computeExperience } from "@/utilities/experience";
import { detectYearsConflict, stripYearsRequest } from "@/validation/summary-guards";
import {
  generateSummary,
  improveSummary,
  toneAt,
  type ToneId,
} from "@/services/ai/mock";
import { EditWithAiMenu, SummaryStatusBadge } from "./ai-edit";
import { EditableSectionHeading } from "./field";
import { RichTextEditor, type RichTextEditorHandle } from "../rich-text-editor";

/** Most temporary candidates kept per editing session (spec: cap at 10). */
const MAX_VARIANTS = 10;

/** Escape user text before embedding it in summary HTML. */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Summary HTML -> plain text (paragraph breaks preserved). */
function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Employment description HTML -> bullet strings (list items, else text lines). */
function htmlToBullets(html: string): string[] {
  if (!html) return [];
  const items = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => htmlToText(m[1]))
    .filter(Boolean);
  if (items.length) return items;
  return htmlToText(html)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Plain text -> summary HTML (<p> per blank-line block). */
function textToHtml(text: string): string {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((b) => escapeHtml(b.trim()).replace(/\n/g, "<br/>"))
    .filter(Boolean);
  return blocks.length ? blocks.map((b) => `<p>${b}</p>`).join("") : "";
}

/**
 * A stable signature of the resume sections a summary is written from
 * (employment, skills, education). Stored when a summary is applied; a later
 * mismatch means those details changed and the summary may be out of date.
 */
function summarySignature(st: ResumeState): string {
  return JSON.stringify({
    e: st.employment.map((e) => [
      e.jobTitle,
      e.company,
      e.startDate,
      e.endDate,
      htmlToText(e.description),
    ]),
    s: st.skills.map((sk) => sk.name),
    d: st.education.map((ed) => [ed.degree, ed.institution]),
  });
}

/** One AI draft, plus the tone it was written in. */
interface Variant {
  text: string;
  tone: ToneId;
}

/** Instruction used when auto-improving an existing summary on entering the section. */
const AUTO_IMPROVE_INSTRUCTION =
  "Improve the clarity, wording and impact of this summary while keeping it truthful to the resume.";

/**
 * Editor section for the professional summary.
 *
 * Two AI entry points share one suggestion panel:
 *   - "Write with AI"   when the editor is empty  - drafts from scratch
 *   - "Improve with AI" once there is content     - refines what is there
 *
 * Nothing an AI writes reaches the resume (or the live preview) until the user
 * clicks Use. "Rewrite" appends another draft in the next tone, and the pager
 * lets the user walk back to one they liked.
 */
export function ProfessionalSummaryForm() {
  const summary = useResumeStore((s) => s.summary);
  const setSummary = useResumeStore((s) => s.setSummary);
  const summaryTitle = useResumeStore((s) => s.summaryTitle);
  const setSummaryTitle = useResumeStore((s) => s.setSummaryTitle);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const setSummaryBasis = useResumeStore((s) => s.setSummaryBasis);
  // A summary needs a role to write about: a desired job title (Personal
  // details) OR a job title in the employment history. Without one, we show a
  // missing-context note instead of drafting a misleading generic summary.
  const hasRole = useResumeStore((s) =>
    Boolean(s.personal.jobTitle.trim() || s.employment.some((e) => e.jobTitle.trim()))
  );

  const [busy, setBusy] = useState(false);
  // Set when an "Ask AI to..." request demands more years than the resume dates
  // support - we surface a conflict with a safe alternative instead of sending it.
  const [conflict, setConflict] = useState<{
    requested: number;
    supported: number | null;
    instruction: string;
  } | null>(null);
  // Set when the resume sections drifted since the applied summary was written,
  // offering a one-tap regenerate (the saved summary stays until Use).
  const [changedPrompt, setChangedPrompt] = useState(false);
  // Which control kicked off the running AI call, so only that button spins -
  // the toolbar "Improve with AI" and the panel "Rewrite" share one busy flag
  // but must never show their loading label at the same time.
  const [busySource, setBusySource] = useState<"toolbar" | "panel" | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [index, setIndex] = useState(0);
  /** The instruction that opened the panel; "" means "write from scratch". */
  const [instruction, setInstruction] = useState("");
  // True while a selected-text edit runs (no draft panel), so the toolbar button
  // shows its own spinner rather than the panel's "Generating..." indicator.
  const [selBusy, setSelBusy] = useState(false);
  // The AI draft panel, so we can scroll it into view when it opens.
  const previewRef = useRef<HTMLDivElement>(null);
  // Editor handle for selected-text editing (read the selection, splice a reply).
  const editorRef = useRef<RichTextEditorHandle>(null);
  // Monotonic token: a draft only applies if it is still the latest request, so a
  // response that resolves after a newer one (or a section change) is ignored.
  const reqId = useRef(0);

  const hasContent = htmlToText(summary).length > 0;
  const current = variants[index];
  // No role and nothing written yet: block generation, show a missing-context note.
  const needsRole = !hasRole && !hasContent;

  // When an "Improve with AI" / "Write with AI" action opens the draft panel,
  // scroll it into view so the generated summary is visible right away.
  useEffect(() => {
    if (panelOpen) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [panelOpen]);

  /**
   * Produce one more draft and show it. `nextInstruction` empty = generate from
   * scratch; otherwise refine the editor's current text with that instruction.
   * The tone advances with each draft so Rewrite explores, not repeats.
   */
  async function draft(nextInstruction: string, append: boolean) {
    const tone = toneAt(append ? variants.length : 0).id;
    const text = htmlToText(summary);
    // The editor can be emptied while the panel is open, which would leave a
    // rewrite asking AI to improve nothing. Fall back to writing from scratch.
    const refine = Boolean(nextInstruction) && text.length > 0;

    const st = useResumeStore.getState();
    // Trusted years, computed from ALL employment (not the 3 sent for content).
    const computedExperience = computeExperience(
      st.employment.map((e) => ({ startDate: e.startDate, endDate: e.endDate }))
    );

    // Generating from scratch with no role would produce a misleading generic
    // summary - block it and let the missing-context note guide the user.
    if (!refine && !hasRole) {
      toast.error("Add a job title first", {
        description:
          "Enter a desired job title in Personal details, or a role in Employment history.",
      });
      return;
    }

    // A custom "Ask AI to..." request that demands more years than the resume
    // supports is a conflict: show it (with a safe alternative) instead of asking
    // the model to fabricate experience.
    const conflictInfo = detectYearsConflict(nextInstruction, computedExperience);
    if (conflictInfo) {
      setConflict({ ...conflictInfo, instruction: nextInstruction });
      return;
    }
    setConflict(null);

    const myReq = ++reqId.current; // this draft's token (stale check after await)
    setInstruction(nextInstruction);
    setPanelOpen(true);
    setBusy(true);
    // A panel "Rewrite" appends; the toolbar "Improve/Write" replaces. That
    // tells us which button to spin.
    setBusySource(append ? "panel" : "toolbar");
    if (!append) {
      setVariants([]); // opens the panel in its loading state
      setIndex(0);
    }

    // Ground the summary in the candidate's real resume data (read above), so it
    // reflects the latest employment / skills / education.
    const ctx = {
      employment: st.employment.slice(0, 3).map((e) => ({
        jobTitle: e.jobTitle,
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        bullets: htmlToBullets(e.description),
      })),
      skills: st.skills.map((sk) => sk.name).filter(Boolean),
      education: st.education.map((e) => ({
        degree: e.degree,
        institution: e.institution,
      })),
      // The AI states this verbatim and never recalculates it.
      computedExperience,
    };

    const result = refine
      ? await improveSummary({ tone, text, jobTitle, instruction: nextInstruction, ...ctx })
      : await generateSummary({ tone, jobTitle, ...ctx });

    // Ignore a response that is no longer the latest request (rapid re-runs).
    if (myReq !== reqId.current) return;

    setBusy(false);
    setBusySource(null);

    if (!result?.trim()) {
      if (!append) setPanelOpen(false);
      toast.error("Couldn't reach AI", {
        description: "Please try again in a moment.",
      });
      return;
    }

    const next: Variant = { text: result, tone };
    // Cap the session's candidate history: keep the newest MAX_VARIANTS, so a
    // long Rewrite streak can't grow the pager unbounded.
    setVariants((prev) => (append ? [...prev, next].slice(-MAX_VARIANTS) : [next]));
    setIndex(append ? Math.min(variants.length, MAX_VARIANTS - 1) : 0);
  }

  /** Toolbar action: write from scratch, or refine with the chosen preset. */
  const runAi = (nextInstruction: string) => draft(nextInstruction, false);

  /** Panel action: another draft with the chosen rewrite option, keeping the
   *  earlier ones so the pager can walk back to them. */
  const rewriteWith = (nextInstruction: string) => draft(nextInstruction, true);

  /**
   * Toolbar "Improve with AI": if the user has highlighted part of the summary,
   * rewrite ONLY that fragment in place; otherwise draft/refine the whole thing.
   */
  function runAiSmart(nextInstruction: string) {
    const sel = editorRef.current?.getSelectionInfo();
    if (sel?.hasSelection) {
      void editSelection(nextInstruction, sel.selectedText);
      return;
    }
    runAi(nextInstruction);
  }

  /** Rewrite just the highlighted fragment and splice the reply back in place. */
  async function editSelection(nextInstruction: string, selectedText: string) {
    if (busy || selBusy) return;
    setSelBusy(true);
    const st = useResumeStore.getState();
    const ctx = {
      employment: st.employment.slice(0, 3).map((e) => ({
        jobTitle: e.jobTitle,
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        bullets: htmlToBullets(e.description),
      })),
      skills: st.skills.map((sk) => sk.name).filter(Boolean),
      education: st.education.map((e) => ({ degree: e.degree, institution: e.institution })),
      computedExperience: computeExperience(
        st.employment.map((e) => ({ startDate: e.startDate, endDate: e.endDate }))
      ),
    };
    const result = await improveSummary({
      tone: toneAt(0).id,
      text: selectedText,
      jobTitle,
      instruction: nextInstruction || "Improve this",
      selectedText,
      ...ctx,
    });
    setSelBusy(false);
    if (!result?.trim()) {
      toast.error("Couldn't reach AI", { description: "Please try again in a moment." });
      return;
    }
    editorRef.current?.replaceSelection(result.trim());
    toast.success("Selection updated", {
      action: { label: "Undo", onClick: () => editorRef.current?.undo() },
    });
  }

  // On entering the section, decide what to show once:
  //  - No summary yet, with a role + some resume data -> draft a first version.
  //  - A summary exists -> do NOT auto-regenerate (per spec). Establish the
  //    change baseline the first time; on later visits, if the resume drifted,
  //    offer to generate an updated version instead of silently rewriting.
  const didAutoDraft = useRef(false);
  useEffect(() => {
    if (didAutoDraft.current) return;
    didAutoDraft.current = true;
    const st = useResumeStore.getState();
    const hasSummary = htmlToText(st.summary).length > 0;
    if (hasSummary) {
      const sig = summarySignature(st);
      if (!st.summaryBasis) setSummaryBasis(sig); // first baseline for this summary
      else if (st.summaryBasis !== sig) setChangedPrompt(true);
      return;
    }
    // No summary: only draft when there's a role AND something to build from.
    const hasBasisData = st.employment.length > 0 || st.skills.length > 0;
    if (!hasRole || !hasBasisData) return;
    draft("", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Apply the shown draft to the editor. Only now does the preview change. */
  function usePreview() {
    if (!current) return;
    setSummary(textToHtml(current.text));
    // Record the resume state this summary was written from, so a later change
    // to employment/skills/education can offer a refreshed version.
    setSummaryBasis(summarySignature(useResumeStore.getState()));
    setPanelOpen(false);
    setVariants([]);
    setIndex(0);
    setChangedPrompt(false);
    toast.success("Summary updated");
  }

  /** Conflict action: run the request WITHOUT the unsupported years demand. */
  function useSafeAlternative() {
    if (!conflict) return;
    const safe = stripYearsRequest(conflict.instruction) || AUTO_IMPROVE_INSTRUCTION;
    setConflict(null);
    draft(safe, false);
  }

  /** Regenerate after a resume change: a fresh candidate; saved summary stays. */
  function regenerateFromChange() {
    setChangedPrompt(false);
    draft(AUTO_IMPROVE_INSTRUCTION, false);
  }

  /** Dismiss the change prompt and stop nagging until the next real change. */
  function dismissChangePrompt() {
    setChangedPrompt(false);
    setSummaryBasis(summarySignature(useResumeStore.getState()));
  }

  function closePanel() {
    setPanelOpen(false);
    setVariants([]);
    setIndex(0);
  }

  return (
    <div>
      <EditableSectionHeading
        title={summaryTitle}
        fallback="Professional summary"
        onChange={setSummaryTitle}
        description="This section draws the most attention from recruiters. Start with your role and years of experience, then mention 2-3 key skills and achievements. Keep it to 2-4 sentences."
      />

      {/* Resume changed since this summary was written: offer to refresh it. The
          saved summary stays put; regenerate only produces a candidate. */}
      {changedPrompt && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-accent px-4 py-3">
          <TriangleAlert className="size-4 shrink-0 text-[var(--ai-text)]" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-medium text-accent-foreground">
            Your resume details changed. Generate an updated summary?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dismissChangePrompt}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={regenerateFromChange}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ai-solid)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <WandSparkles className="size-4" />
              Generate updated summary
            </button>
          </div>
        </div>
      )}

      <RichTextEditor
        ref={editorRef}
        value={summary}
        onChange={setSummary}
        minHeight={150}
        placeholder="Account Manager with 3 years' experience in client relations. Strong in communication and CRM tools."
        toolbarRight={
          <div className="flex items-center gap-3">
            <SummaryStatusBadge html={summary} />
            {hasContent ? (
              /* Content exists -> refine it (or, with text highlighted, edit just
                 the selection in place). The button spins only for a selection
                 edit; a whole-summary draft shows the panel's "Generating..." */
              <EditWithAiMenu
                busy={selBusy}
                disabled={busy || selBusy}
                onRun={runAiSmart}
                label="Improve with AI"
                busyLabel="Improving…"
              />
            ) : (
              /* Nothing written yet -> the strongest affordance on the screen. */
              <button
                type="button"
                disabled={busy}
                onClick={() => runAi("")}
                className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-[var(--ai-solid)] to-[var(--ai-to)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {/* No spinner here either: the panel's "Generating..." carries the
                    loading state. The button just disables while it runs. */}
                <WandSparkles className="size-3.5" />
                Write with AI
              </button>
            )}
          </div>
        }
      />

      {/* AI draft. Sits below the editor, visibly separate, and applies to the
          resume only via Use. */}
      {panelOpen && (
        <div
          ref={previewRef}
          className="relative mt-3 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/5 px-4 pb-4 pt-5"
        >
          <span className="absolute -top-3 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[var(--ai-solid)] text-white shadow-sm">
            <Sparkles className="size-3.5" />
          </span>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Dismiss AI suggestion"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          {!current ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-[var(--ai-text)]" />
              Generating…
            </div>
          ) : (
            <>
              <div
                aria-live="polite"
                className="mt-1 space-y-2 text-sm leading-relaxed text-foreground"
              >
                {current.text.split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Pager: revisit an earlier draft instead of losing it. */}
                  {variants.length > 1 && (
                    <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setIndex((i) => i - 1)}
                        disabled={index === 0}
                        aria-label="Previous suggestion"
                        className="grid size-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span aria-live="polite">
                        {index + 1}/{variants.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIndex((i) => i + 1)}
                        disabled={index === variants.length - 1}
                        aria-label="Next suggestion"
                        className="grid size-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Rewrite is a menu of options (Improve / More human /
                      Shorter / Ask AI to…); each appends a new paged draft. */}
                  <EditWithAiMenu
                    busy={busy && busySource === "panel"}
                    disabled={busy}
                    onRun={rewriteWith}
                    label="Rewrite"
                    busyLabel="Rewriting…"
                    idleIcon={RefreshCw}
                    triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={usePreview}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ai-solid)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    Use
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Conflict: the request asked for more years than the resume supports. */}
      {conflict && (
        <div className="mt-3 rounded-xl border border-[#D97706]/40 bg-[#D97706]/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#B45309]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                That would overstate your experience
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {conflict.supported != null
                  ? `Your employment dates support ${conflict.supported} ${conflict.supported === 1 ? "year" : "years"} of experience, not ${conflict.requested}. Update your dates, or generate a version without an unsupported number.`
                  : `Your employment dates do not establish a specific number of years, so a "${conflict.requested}-year" claim cannot be supported. Add or complete your dates, or generate a version without a years figure.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={useSafeAlternative}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ai-solid)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="size-4" />
                  Use safe alternative
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConflict(null);
                    setActiveSection("employment");
                  }}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Review employment dates
                </button>
                <button
                  type="button"
                  onClick={() => setConflict(null)}
                  aria-label="Dismiss conflict"
                  className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing context: no role to write about yet. */}
      {needsRole ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Add a job title to generate a summary
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Enter a desired job title in Personal details, or add a role in your
              Employment history, then the AI can write a summary grounded in it.
            </p>
            <button
              type="button"
              onClick={() => setActiveSection("personal")}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Add job title
            </button>
          </div>
        </div>
      ) : (
        !hasContent &&
        !panelOpen && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: write it yourself, or let{" "}
            <span className="font-semibold text-[var(--ai-text)]">Write with AI</span>{" "}
            draft a first version you can edit.
          </p>
        )
      )}
    </div>
  );
}
