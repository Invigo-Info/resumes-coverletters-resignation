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
  Trash2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  useResumeStore,
  type EmploymentEntry,
} from "@/lib/store/resume-store";
import { improveBullets, rewriteBullets } from "@/lib/ai/mock";
import { EditWithAiMenu, BulletStatusBadge } from "./ai-edit";
import { Field, FieldWrap, EditableSectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { JOB_TITLES, LOCATION_SUGGESTIONS } from "@/lib/suggestions";
import { titleCase } from "@/lib/title-case";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Strip HTML tags to plain text. */
const strip = (html: string) => html.replace(/<[^>]*>/g, "").trim();
/** Join start/end into a "start - end" range, skipping blanks. */
const dateRange = (a: string, b: string) => [a, b].filter(Boolean).join(" - ");

/** Escape user text before embedding it in bullet HTML. */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Pull bullet text out of the description HTML.
 *
 * A real <ul> wins. Failing that, each block the user sees as its own line - a
 * paragraph, a div, a <br> - counts as one bullet, so the status badge reflects
 * what is on screen rather than only formally-marked list items.
 */
function htmlToBullets(html: string): string[] {
  if (!html) return [];
  const lis = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => strip(m[1]))
    .filter(Boolean);
  if (lis.length) return lis;

  const blocks = html
    .split(/<\/(?:p|div)>|<br\s*\/?>/i)
    .map(strip)
    .filter(Boolean);
  if (blocks.length) return blocks;

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

/** Suggestions are cached per role so switching cards doesn't refetch. */
const ideaCache = new Map<string, string[]>();

/**
 * The description editor plus AI bullet assistance.
 *
 * Suggestions come from THIS entry's job title, never from the desired job title
 * in Personal details. With no job title we still show generic, transferable
 * bullets so the user is never staring at an empty helper.
 */
function EmploymentDescription({ entry }: { entry: EmploymentEntry }) {
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const setActiveBlockIndex = useResumeStore((s) => s.setActiveBlockIndex);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  // Which control started the running AI edit, so only that button spins - the
  // toolbar "Edit with AI" and the panel "Rewrite" share one flag but must not
  // show their loading label at the same time.
  const [editingSource, setEditingSource] = useState<"toolbar" | "panel" | null>(null);
  // AI "Edit with AI" preview: null = closed, [] = generating, [...] = result.
  const [preview, setPreview] = useState<string[] | null>(null);
  const [previewInstruction, setPreviewInstruction] = useState("");
  const loadedFor = useRef<string | null>(null);
  // The "Edit with AI" result panel, so we can scroll it into view when it opens.
  const previewRef = useRef<HTMLDivElement>(null);

  const bullets = htmlToBullets(entry.description);
  const hasContent = strip(entry.description).length > 0;

  // Fetch example bullet ideas for this entry's role (reads fresh store state
  // so the callback stays stable across keystrokes).
  const fetchIdeas = useCallback(
    async (nextPage: number) => {
      const e = useResumeStore.getState().employment.find((x) => x.id === entry.id);
      if (!e) return;
      const role = e.jobTitle.trim();
      // Suggestions build on the bullets already in this entry (e.g. parsed from
      // an uploaded resume), so they complement the candidate's real experience.
      const existing = htmlToBullets(e.description);
      // Fold the existing bullets into the cache key so a different resume yields
      // different suggestions (short signature keeps the key bounded).
      const sig = `${existing.length}:${existing.join("|").slice(0, 60).toLowerCase()}`;
      const cacheKey = `${role.toLowerCase()}::${sig}::${nextPage}`;
      const cached = ideaCache.get(cacheKey);
      if (cached) {
        // Replace, never append: "Show more ideas" swaps in a fresh set and
        // drops the previous one, so only the newly generated bullets show.
        setIdeas(cached);
        setPage(nextPage);
        return;
      }
      setLoading(true);
      // Clear the old ideas up front so they're removed while the new set loads
      // (the skeleton rows fill their place until it arrives).
      setIdeas([]);
      const more = await improveBullets({
        role, // "" -> generic bullets, by design
        company: e.company,
        page: nextPage,
        existing,
      });
      ideaCache.set(cacheKey, more);
      setIdeas(more);
      setPage(nextPage);
      setLoading(false);
    },
    [entry.id]
  );

  // Surface bullet ideas for the entry's job title, debounced so we don't call
  // the AI on every keystroke. Suggestions are role-driven: with NO job title we
  // show nothing (and clear any previous set) - they appear only once the user
  // enters a title, tailored to it.
  useEffect(() => {
    const key = entry.jobTitle.trim().toLowerCase();
    if (loadedFor.current === key) return;
    if (!key) {
      loadedFor.current = key;
      setIdeas([]); // no title yet -> no suggestions
      return;
    }
    const t = setTimeout(() => {
      loadedFor.current = key;
      setIdeas([]);
      fetchIdeas(0);
    }, 500);
    return () => clearTimeout(t);
  }, [entry.jobTitle, fetchIdeas]);

  // When an "Edit with AI" action opens the result panel (Improve / Shorter /
  // More human / Ask AI to…), scroll it into view so the generated bullets are
  // visible right away, even on a long entry where the panel is below the fold.
  const previewOpen = preview !== null;
  useEffect(() => {
    if (previewOpen) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [previewOpen]);

  // "Edit with AI" - generate a rewritten version to PREVIEW (Rewrite / Use).
  // keepPanel: from the preview's Rewrite menu (keep showing the current result
  // while regenerating); otherwise open the panel fresh in its loading state.
  async function generate(instruction: string, keepPanel: boolean) {
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
    // Panel "Rewrite" keeps the panel; the toolbar "Edit with AI" opens it fresh.
    setEditingSource(keepPanel ? "panel" : "toolbar");
    const result = await rewriteBullets({
      bullets,
      instruction: reroll
        ? `${instruction} Give a fresh alternative phrasing, different from a previous attempt.`
        : instruction,
      jobTitle: entry.jobTitle,
    });
    setEditing(false);
    setEditingSource(null);
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

  // Apply the previewed AI bullets as the entry's description and close the panel.
  function usePreview() {
    if (!preview || !preview.length) return;
    updateEmployment(entry.id, { description: bulletsToUl(preview) });
    setPreview(null);
    toast.success("Bullet points updated");
  }

  // Append a suggested bullet into the description's <ul> (creating one if needed).
  function insert(text: string, index: number) {
    const current = entry.description.replace(/<p><\/p>/g, "").trim();
    const li = `<li>${escapeHtml(text)}</li>`;
    const next = current.includes("<ul>")
      ? current.replace("</ul>", `${li}</ul>`)
      : `${current}<ul>${li}</ul>`;
    updateEmployment(entry.id, { description: next });
    // Remove the chosen suggestion so it no longer shows in the list.
    const remaining = ideas.filter((_, i) => i !== index);
    setIdeas(remaining);
    // Once every suggestion in the batch has been added, automatically generate
    // the next 7 so the user always has a fresh set to pick from.
    if (remaining.length === 0 && !loading) {
      fetchIdeas(page + 1);
    }
  }

  return (
    <div className="mt-4">
      <RichTextEditor
        value={entry.description}
        onChange={(html) => updateEmployment(entry.id, { description: html })}
        onActiveBlockChange={setActiveBlockIndex}
        placeholder="Describe numbers or concrete outcomes when you can"
        toolbarRight={
          hasContent ? (
            <div className="flex items-center gap-3">
              <BulletStatusBadge count={bullets.length} />
              <EditWithAiMenu
                // The toolbar button never spins: the panel's "Generating..." is
                // the loading state; the button just disables so it can't refire.
                busy={false}
                disabled={editing}
                onRun={runAiEdit}
              />
            </div>
          ) : undefined
        }
      />

      {/* "Edit with AI" result preview - Rewrite to regenerate, Use to apply. */}
      {preview !== null && (
        <div
          ref={previewRef}
          className="relative mt-3 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/5 px-4 pb-4 pt-5"
        >
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
                  busy={editing && editingSource === "panel"}
                  disabled={editing}
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

      {preview === null && (ideas.length > 0 || loading) && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ai-from)]">
            <Sparkles className={loading ? "size-3.5 animate-pulse" : "size-3.5"} />
            Suggested bullet points
          </p>

          {/* Skeleton rows while the first page loads, so the block does not pop in. */}
          {ideas.length === 0 ? (
            <ul className="divide-y divide-border" aria-busy>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i} className="flex items-start gap-2.5 py-3">
                  <span className="mt-0.5 size-4 shrink-0 animate-pulse rounded bg-muted" />
                  <span
                    className="h-4 animate-pulse rounded bg-muted"
                    style={{ width: `${90 - i * 8}%` }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border">
              {ideas.map((idea, i) => (
                <li key={idea}>
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
          )}

          {ideas.length > 0 && (
            <button
              type="button"
              onClick={() => fetchIdeas(page + 1)}
              disabled={loading}
              className="ml-auto mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {loading ? "Loading…" : "Show more ideas"}
              <ChevronDown className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Empty state shown once every experience has been deleted. */
function NoExperience({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Briefcase className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">No experience added yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the jobs that show the impact you have made.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        Add work experience
      </button>
    </div>
  );
}

/**
 * Editor section for employment history - an accordion of job entries (only one
 * open at a time), each with its own AI-assisted bullet description. Entries can
 * be dragged to reorder, deleted with an undo, and the whole section can be
 * removed (and later restored from Additional sections).
 */
export function EmploymentHistoryForm() {
  const employment = useResumeStore((s) => s.employment);
  const employmentTitle = useResumeStore((s) => s.employmentTitle);
  const setEmploymentTitle = useResumeStore((s) => s.setEmploymentTitle);
  const addEmployment = useResumeStore((s) => s.addEmployment);
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const removeEmployment = useResumeStore((s) => s.removeEmployment);
  const insertEmployment = useResumeStore((s) => s.insertEmployment);
  const reorderEmployment = useResumeStore((s) => s.reorderEmployment);
  const removeSection = useResumeStore((s) => s.removeSection);
  const restoreSection = useResumeStore((s) => s.restoreSection);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  // Accordion: only one entry open at a time. null = all collapsed.
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const didInit = useRef(false);

  // Start with one empty entry so the form isn't blank on a fresh resume. Once
  // the user has deleted them all, respect that and show the empty state.
  useEffect(() => {
    if (!didInit.current && useResumeStore.getState().employment.length === 0) {
      addEmployment();
    }
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

  /** Delete one entry immediately, with an undo that restores its position. */
  function handleDeleteEntry(entry: EmploymentEntry) {
    const index = useResumeStore.getState().employment.findIndex((e) => e.id === entry.id);
    removeEmployment(entry.id);
    if (openId === entry.id) setOpenId(null);
    toast.success("Successfully deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          insertEmployment(entry, index);
          setOpenId(entry.id);
        },
      },
    });
  }

  /** Remove the whole section from the resume, with an undo. */
  function handleDeleteSection() {
    setConfirmOpen(false);
    removeSection("employment");
    setActiveSection("personal");
    toast.success("Employment history removed", {
      duration: 6000,
      description: "You can add it back from Additional sections.",
      action: {
        label: "Undo",
        onClick: () => {
          restoreSection("employment");
          setActiveSection("employment");
        },
      },
    });
  }

  function commitDrop() {
    if (dragIndex !== null && overIndex !== null) {
      reorderEmployment(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  /** Keyboard reorder from the grip handle. */
  function move(index: number, dir: "up" | "down") {
    const to = dir === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= employment.length) return;
    reorderEmployment(index, to);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableSectionHeading
            title={employmentTitle}
            fallback="Employment history"
            onChange={setEmploymentTitle}
            description="Show employers your past experience and key achievements. Add 4-6 bullet points to demonstrate your impact and skills clearly."
          />
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete the employment history section"
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        {employment.length === 0 && <NoExperience onAdd={handleAdd} />}

        {employment.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.jobTitle, e.company].filter(Boolean).join(", ") || "Untitled"}
            subtitle={dateRange(e.startDate, e.endDate)}
            deleteLabel={`Delete ${e.jobTitle || "this experience"}`}
            onDelete={() => handleDeleteEntry(e)}
            open={openId === e.id}
            onToggle={() => setOpenId((prev) => (prev === e.id ? null : e.id))}
            onActivate={() => setActiveEntryId(e.id)}
            drag={{
              index: i,
              dragging: dragIndex === i,
              over: overIndex === i,
              onDragStart: setDragIndex,
              onDragOver: setOverIndex,
              onDrop: commitDrop,
              onDragEnd: commitDrop,
              onMove: (dir) => move(i, dir),
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Job title">
                <AutocompleteInput
                  value={e.jobTitle}
                  // Title-case as they type: "sales manager" -> "Sales Manager".
                  onChange={(v) => updateEmployment(e.id, { jobTitle: titleCase(v) })}
                  placeholder="e.g., Product Designer"
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
            {/* Two date pickers side by side need ~360px; stack below that. */}
            <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3">
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
                  placeholder="e.g., Washington"
                  options={LOCATION_SUGGESTIONS}
                  aiKind="location"
                />
              </FieldWrap>
            </div>
            {isEndBeforeStart(e.startDate, e.endDate) && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                End date can&apos;t be before the start date.
              </p>
            )}
            <EmploymentDescription entry={e} />
          </EntryCard>
        ))}

        {employment.length > 0 && (
          <AddMoreButton label="Add another experience" onClick={handleAdd} />
        )}
      </div>

      {/* Whole-section delete confirmation. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl p-6 pt-8 sm:max-w-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-destructive/10" aria-hidden>
              <Trash2 className="size-8 text-destructive" />
            </span>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Are you sure you want to delete this section?
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              You can&apos;t undo this action.
            </DialogDescription>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-full bg-muted py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSection}
              className="flex-1 rounded-full bg-destructive py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
