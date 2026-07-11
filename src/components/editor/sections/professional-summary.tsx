"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/lib/store/resume-store";
import {
  generateSummary,
  improveSummary,
  toneAt,
  type ToneId,
} from "@/lib/ai/mock";
import { EditWithAiMenu, SummaryStatusBadge } from "./ai-edit";
import { EditableSectionHeading } from "./field";
import { RichTextEditor } from "../rich-text-editor";

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

/** Plain text -> summary HTML (<p> per blank-line block). */
function textToHtml(text: string): string {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((b) => escapeHtml(b.trim()).replace(/\n/g, "<br/>"))
    .filter(Boolean);
  return blocks.length ? blocks.map((b) => `<p>${b}</p>`).join("") : "";
}

/** One AI draft, plus the tone it was written in. */
interface Variant {
  text: string;
  tone: ToneId;
}

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

  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [index, setIndex] = useState(0);
  /** The instruction that opened the panel; "" means "write from scratch". */
  const [instruction, setInstruction] = useState("");

  const hasContent = htmlToText(summary).length > 0;
  const current = variants[index];

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

    setInstruction(nextInstruction);
    setPanelOpen(true);
    setBusy(true);
    if (!append) {
      setVariants([]); // opens the panel in its loading state
      setIndex(0);
    }

    const result = refine
      ? await improveSummary({ tone, text, jobTitle, instruction: nextInstruction })
      : await generateSummary({ tone, jobTitle });

    setBusy(false);

    if (!result?.trim()) {
      if (!append) setPanelOpen(false);
      toast.error("Couldn't reach AI", {
        description: "Please try again in a moment.",
      });
      return;
    }

    const next: Variant = { text: result, tone };
    setVariants((prev) => (append ? [...prev, next] : [next]));
    setIndex(append ? variants.length : 0); // land on the draft we just made
  }

  /** Toolbar action: write from scratch, or refine with the chosen preset. */
  const runAi = (nextInstruction: string) => draft(nextInstruction, false);

  /** Panel action: another draft in the next tone, keeping the earlier ones. */
  const rewrite = () => draft(instruction, true);

  /** Apply the shown draft to the editor. Only now does the preview change. */
  function usePreview() {
    if (!current) return;
    setSummary(textToHtml(current.text));
    setPanelOpen(false);
    setVariants([]);
    setIndex(0);
    toast.success("Summary updated");
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

      <RichTextEditor
        value={summary}
        onChange={setSummary}
        minHeight={150}
        placeholder="Account Manager with 3 years' experience in client relations. Strong in communication and CRM tools."
        toolbarRight={
          <div className="flex items-center gap-3">
            <SummaryStatusBadge html={summary} />
            {hasContent ? (
              /* Content exists -> refine it. Neutral styling: this is a tweak,
                 not a fresh start. */
              <EditWithAiMenu
                busy={busy}
                onRun={runAi}
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
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <WandSparkles className="size-3.5" />
                )}
                {busy ? "Writing…" : "Write with AI"}
              </button>
            )}
          </div>
        }
      />

      {/* AI draft. Sits below the editor, visibly separate, and applies to the
          resume only via Use. */}
      {panelOpen && (
        <div className="relative mt-3 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/5 px-4 pb-4 pt-5">
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
                  {/* Names the voice of this draft, so two rewrites are
                      comparable at a glance. */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ai-from)]/30 bg-card px-2.5 py-1 text-xs font-semibold text-[var(--ai-text)]">
                    <Sparkles className="size-3" aria-hidden />
                    {toneLabel(current.tone)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rewrite}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {busy ? "Rewriting…" : "Rewrite"}
                  </button>
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

      {!hasContent && !panelOpen && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: write it yourself, or let{" "}
          <span className="font-semibold text-[var(--ai-text)]">Write with AI</span>{" "}
          draft a first version you can edit.
        </p>
      )}
    </div>
  );
}

/** "visionary" -> "Visionary". */
function toneLabel(tone: ToneId): string {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}
