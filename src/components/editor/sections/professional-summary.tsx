"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/lib/store/resume-store";
import { rewriteText } from "@/lib/ai/mock";
import { EditWithAiMenu, LengthBadge } from "./ai-edit";
import { SectionHeading } from "./field";
import { RichTextEditor } from "../rich-text-editor";

/** Escape user text before embedding it in summary HTML. */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Summary HTML → plain text (paragraph breaks preserved). */
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

/** Plain text → summary HTML (<p> per blank-line block). */
function textToHtml(text: string): string {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((b) => escapeHtml(b.trim()).replace(/\n/g, "<br/>"))
    .filter(Boolean);
  return blocks.length ? blocks.map((b) => `<p>${b}</p>`).join("") : "";
}

/**
 * Editor section for the professional summary: a rich-text editor plus an
 * "Edit with AI" flow that previews a rewritten version before applying it.
 */
export function ProfessionalSummaryForm() {
  const summary = useResumeStore((s) => s.summary);
  const setSummary = useResumeStore((s) => s.setSummary);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);

  const [editing, setEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [previewInstruction, setPreviewInstruction] = useState("");

  const hasContent = htmlToText(summary).length > 0;

  // "Edit with AI" — generate a rewritten summary to PREVIEW (Rewrite / Use).
  async function generate(instruction: string, keepPanel: boolean) {
    const text = htmlToText(summary);
    if (!text) {
      toast.error("Write a summary first", {
        description: "Add a sentence or two, then edit it with AI.",
      });
      return;
    }
    const reroll = keepPanel && instruction === previewInstruction;
    setPreviewInstruction(instruction);
    setPreviewOpen(true);
    if (!keepPanel) setPreview(""); // open the panel in its loading state
    setEditing(true);
    const result = await rewriteText({
      text,
      instruction: reroll
        ? `${instruction} Give a fresh alternative phrasing, different from a previous attempt.`
        : instruction,
      context: `This is a resume professional summary for a ${
        jobTitle || "professional"
      }. Keep it to 2-4 sentences, ATS-friendly, no markdown.`,
    });
    setEditing(false);
    if (result) {
      setPreview(result);
    } else {
      if (!keepPanel) setPreviewOpen(false);
      toast.error("Couldn't reach AI", {
        description: "Please try again in a moment.",
      });
    }
  }

  const runAiEdit = (instruction: string) => generate(instruction, false);

  // Apply the previewed AI rewrite as the new summary and close the panel.
  function usePreview() {
    if (!preview) return;
    setSummary(textToHtml(preview));
    setPreviewOpen(false);
    setPreview("");
    toast.success("Summary updated");
  }

  return (
    <div>
      <SectionHeading
        title="Professional summary"
        description="This section draws the most attention from recruiters. Start with your role and years of experience, then mention 2-3 key skills and achievements. Keep it to 2-4 sentences."
      />

      <RichTextEditor
        value={summary}
        onChange={setSummary}
        minHeight={150}
        placeholder="Account Manager with 3 years' experience in client relations. Strong in communication and CRM tools."
        toolbarRight={
          <div className="flex items-center gap-3">
            <LengthBadge html={summary} />
            <EditWithAiMenu busy={editing} onRun={runAiEdit} />
          </div>
        }
      />

      {/* "Edit with AI" result preview — Rewrite to regenerate, Use to apply. */}
      {previewOpen && (
        <div className="relative mt-3 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/5 px-4 pb-4 pt-5">
          <span className="absolute -top-3 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[var(--ai-from)] text-white shadow-sm">
            <Sparkles className="size-3.5" />
          </span>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          {!preview ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-[var(--ai-from)]" />
              Generating…
            </div>
          ) : (
            <>
              <div className="mt-1 space-y-2 text-sm leading-relaxed text-foreground">
                {preview.split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <EditWithAiMenu
                  busy={editing}
                  onRun={(instruction) => generate(instruction, true)}
                  label="Rewrite"
                  busyLabel="Rewriting…"
                  idleIcon={RefreshCw}
                  openUp
                  triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={usePreview}
                  disabled={editing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ai-from)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="size-4" />
                  Use
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!hasContent && !previewOpen && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: write a sentence or two, then use{" "}
          <span className="font-semibold text-[var(--ai-from)]">Edit with AI</span>{" "}
          to polish it.
        </p>
      )}
    </div>
  );
}
