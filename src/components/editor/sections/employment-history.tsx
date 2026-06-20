"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Plus,
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeStore, type EmploymentEntry } from "@/lib/store/resume-store";
import { improveBullets, rewriteBullets } from "@/lib/ai/mock";
import { EditWithAiMenu, LengthBadge } from "./ai-edit";
import { Field, FieldWrap, SectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { JOB_TITLES, LOCATIONS } from "@/lib/suggestions";

const strip = (html: string) => html.replace(/<[^>]*>/g, "").trim();
const dateRange = (a: string, b: string) =>
  [a, b].filter(Boolean).join(" – ");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Pull bullet text out of the description HTML (falls back to lines). */
function htmlToBullets(html: string): string[] {
  if (!html) return [];
  const lis = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((m) =>
    strip(m[1])
  );
  if (lis.length) return lis.filter(Boolean);
  return strip(html)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Wrap plain bullet strings back into a <ul>. */
function bulletsToUl(bullets: string[]): string {
  const items = bullets
    .map((b) => b.replace(/^[•\-*\s]+/, "").trim())
    .filter(Boolean);
  if (!items.length) return "";
  return `<ul>${items.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
}

/**
 * The description editor plus AI bullet assistance, mirroring resume.co:
 * - example bullets auto-surface as a clean list once a job title is set
 * - "Improve with AI" sits in the editor toolbar and rewrites existing bullets
 * - each suggestion has a purple "+" to append it; "Show more ideas" paginates
 */
function EmploymentDescription({ entry }: { entry: EmploymentEntry }) {
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const setActiveBlockIndex = useResumeStore((s) => s.setActiveBlockIndex);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  // AI "Edit with AI" preview: null = closed, [] = generating, [...] = result.
  const [preview, setPreview] = useState<string[] | null>(null);
  const [previewInstruction, setPreviewInstruction] = useState("");
  const loadedFor = useRef("");

  const hasContent = strip(entry.description).length > 0;

  // Fetch example bullet ideas for this entry's role (reads fresh store state
  // so the callback stays stable across keystrokes).
  const fetchIdeas = useCallback(
    async (nextPage: number) => {
      const e = useResumeStore.getState().employment.find((x) => x.id === entry.id);
      if (!e) return;
      setLoading(true);
      const more = await improveBullets({
        role: e.jobTitle,
        company: e.company,
        page: nextPage,
      });
      setIdeas((prev) => (nextPage === 0 ? more : [...prev, ...more]));
      setPage(nextPage);
      setLoading(false);
    },
    [entry.id]
  );

  // Auto-surface example bullets shortly after a job title is set — debounced
  // so we don't call the AI on every keystroke.
  useEffect(() => {
    const key = entry.jobTitle.trim().toLowerCase();
    if (!key || loadedFor.current === key) return;
    const t = setTimeout(() => {
      loadedFor.current = key;
      fetchIdeas(0);
    }, 800);
    return () => clearTimeout(t);
  }, [entry.jobTitle, fetchIdeas]);

  // "Edit with AI" — generate a rewritten version to PREVIEW (Rewrite / Use).
  // keepPanel: from the preview's Rewrite menu (keep showing the current result
  // while regenerating); otherwise open the panel fresh in its loading state.
  async function generate(instruction: string, keepPanel: boolean) {
    const bullets = htmlToBullets(entry.description);
    if (!bullets.length) {
      toast.error("Add a few bullet points first", {
        description: "Write or pick some bullets, then edit them with AI.",
      });
      return;
    }
    const reroll = keepPanel && instruction === previewInstruction;
    setPreviewInstruction(instruction);
    if (!keepPanel) setPreview([]); // open the panel in its loading state
    setEditing(true);
    const result = await rewriteBullets({
      bullets,
      instruction: reroll
        ? `${instruction} Give a fresh alternative phrasing, different from a previous attempt.`
        : instruction,
      jobTitle: entry.jobTitle,
    });
    setEditing(false);
    if (result && result.length) {
      setPreview(result);
    } else {
      if (!keepPanel) setPreview(null);
      toast.error("Couldn't reach AI", {
        description: "Please try again in a moment.",
      });
    }
  }

  const runAiEdit = (instruction: string) => generate(instruction, false);

  function usePreview() {
    if (!preview || !preview.length) return;
    updateEmployment(entry.id, { description: bulletsToUl(preview) });
    setPreview(null);
    toast.success("Bullet points updated");
  }

  function insert(text: string, index: number) {
    const current = entry.description.replace(/<p><\/p>/g, "").trim();
    const li = `<li>${text}</li>`;
    const next = current.includes("<ul>")
      ? current.replace("</ul>", `${li}</ul>`)
      : `${current}<ul>${li}</ul>`;
    updateEmployment(entry.id, { description: next });
    // Remove the chosen suggestion so it no longer shows in the list.
    setIdeas((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="mt-4">
      <RichTextEditor
        value={entry.description}
        onChange={(html) => updateEmployment(entry.id, { description: html })}
        onActiveBlockChange={setActiveBlockIndex}
        placeholder="• Describe numbers or concrete outcomes when you can"
        toolbarRight={
          hasContent ? (
            <div className="flex items-center gap-3">
              <LengthBadge html={entry.description} />
              <EditWithAiMenu busy={editing} onRun={runAiEdit} />
            </div>
          ) : undefined
        }
      />

      {/* "Edit with AI" result preview — Rewrite to regenerate, Use to apply. */}
      {preview !== null && (
        <div className="relative mt-3 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/5 px-4 pb-4 pt-5">
          <span className="absolute -top-3 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[var(--ai-from)] text-white shadow-sm">
            <Sparkles className="size-3.5" />
          </span>
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          {preview.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-[var(--ai-from)]" />
              Generating…
            </div>
          ) : (
            <>
              <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm leading-snug text-foreground marker:text-[var(--ai-from)]">
                {preview.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
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

      {preview === null && ideas.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ai-from)]">
            <Sparkles className="size-3.5" />
            Suggested bullet points
          </p>
          <ul className="divide-y divide-border">
            {ideas.map((idea, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => insert(idea, i)}
                  className="group flex w-full items-start gap-2.5 py-2.5 text-left"
                >
                  <Plus className="mt-0.5 size-4 shrink-0 text-[var(--ai-from)]" />
                  <span className="text-sm leading-snug text-neutral-700 transition-colors group-hover:text-foreground">
                    {idea}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => fetchIdeas(page + 1)}
            disabled={loading}
            className="ml-auto mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Loading…" : "Show more ideas"}
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}

      {loading && ideas.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 animate-pulse text-[var(--ai-from)]" />
          Finding bullet ideas…
        </p>
      )}
    </div>
  );
}

export function EmploymentHistoryForm() {
  const employment = useResumeStore((s) => s.employment);
  const addEmployment = useResumeStore((s) => s.addEmployment);
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const removeEmployment = useResumeStore((s) => s.removeEmployment);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  // Accordion: only one entry open at a time. null = all collapsed.
  const [openId, setOpenId] = useState<string | null>(null);
  const didInit = useRef(false);

  // Start with one empty entry so the form isn't blank.
  useEffect(() => {
    if (useResumeStore.getState().employment.length === 0) addEmployment();
  }, [addEmployment]);

  // Open the first entry once on mount (after entries exist).
  useEffect(() => {
    if (!didInit.current && employment.length > 0) {
      didInit.current = true;
      setOpenId(employment[0].id);
    }
  }, [employment]);

  // Mirror the open entry to the store so the preview highlights it; clear the
  // cursor when leaving the section.
  useEffect(() => {
    setActiveEntryId(openId);
    return () => setActiveEntryId(null);
  }, [openId, setActiveEntryId]);

  // Add a new entry and open it (collapsing the others).
  function handleAdd() {
    addEmployment();
    const list = useResumeStore.getState().employment;
    setOpenId(list[list.length - 1]?.id ?? null);
  }

  return (
    <div>
      <SectionHeading
        title="Employment history"
        description="Show employers your past experience and key achievements. Add 4-6 bullet points to demonstrate your impact and skills clearly."
      />

      <div className="space-y-4">
        {employment.map((e) => (
          <EntryCard
            key={e.id}
            title={[e.jobTitle, e.company].filter(Boolean).join(", ") || "Untitled"}
            subtitle={dateRange(e.startDate, e.endDate)}
            onDelete={() => removeEmployment(e.id)}
            open={openId === e.id}
            onToggle={() => setOpenId((prev) => (prev === e.id ? null : e.id))}
            onActivate={() => setActiveEntryId(e.id)}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Job title">
                <AutocompleteInput
                  value={e.jobTitle}
                  onChange={(v) => updateEmployment(e.id, { jobTitle: v })}
                  placeholder="Account Manager"
                  options={JOB_TITLES}
                  aiKind="jobTitle"
                />
              </FieldWrap>
              <Field
                label="Company name"
                value={e.company}
                onChange={(v) => updateEmployment(e.id, { company: v })}
                placeholder="Apple Inc."
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <FieldWrap label="Start date">
                <MonthYearPicker
                  value={e.startDate}
                  onChange={(v) => updateEmployment(e.id, { startDate: v })}
                  placeholder="Jan 2016"
                />
              </FieldWrap>
              <FieldWrap label="End date">
                <MonthYearPicker
                  value={e.endDate}
                  onChange={(v) => updateEmployment(e.id, { endDate: v })}
                  placeholder="Feb 2019"
                  allowPresent
                  min={e.startDate}
                />
              </FieldWrap>
              <FieldWrap label="Location">
                <AutocompleteInput
                  value={e.location}
                  onChange={(v) => updateEmployment(e.id, { location: v })}
                  placeholder="Washington, D.C."
                  options={LOCATIONS}
                  aiKind="location"
                />
              </FieldWrap>
            </div>
            {isEndBeforeStart(e.startDate, e.endDate) && (
              <p className="mt-2 text-sm text-destructive">
                End date can&apos;t be before the start date.
              </p>
            )}
            <EmploymentDescription entry={e} />
          </EntryCard>
        ))}

        <AddMoreButton label="Add another experience" onClick={handleAdd} />
      </div>
    </div>
  );
}
