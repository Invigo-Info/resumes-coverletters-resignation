"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { useResumeStore, type EmploymentEntry } from "@/lib/store/resume-store";
import { improveBullets, refineBullets } from "@/lib/ai/mock";
import { Field, FieldWrap, SectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { JOB_TITLES, LOCATIONS } from "@/lib/suggestions";

const strip = (html: string) => html.replace(/<[^>]*>/g, "").trim();
const dateRange = (a: string, b: string) =>
  [a, b].filter(Boolean).join(" – ");

/**
 * The description editor plus AI bullet assistance, mirroring resume.co:
 * - example bullets auto-surface as a clean list once a job title is set
 * - "Improve with AI" sits in the editor toolbar and rewrites existing bullets
 * - each suggestion has a purple "+" to append it; "Show more ideas" paginates
 */
function EmploymentDescription({ entry }: { entry: EmploymentEntry }) {
  const updateEmployment = useResumeStore((s) => s.updateEmployment);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [improved, setImproved] = useState(false);
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
      setImproved(false);
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

  // Rewrite the user's existing bullets into stronger versions.
  async function improve() {
    if (!hasContent) return;
    setLoading(true);
    const better = await refineBullets({
      text: strip(entry.description),
      role: entry.jobTitle,
    });
    setIdeas(better);
    setImproved(true);
    setPage(0);
    setLoading(false);
  }

  function insert(text: string) {
    const current = entry.description.replace(/<p><\/p>/g, "").trim();
    const li = `<li>${text}</li>`;
    const next = current.includes("<ul>")
      ? current.replace("</ul>", `${li}</ul>`)
      : `${current}<ul>${li}</ul>`;
    updateEmployment(entry.id, { description: next });
  }

  return (
    <div className="mt-4">
      <RichTextEditor
        value={entry.description}
        onChange={(html) => updateEmployment(entry.id, { description: html })}
        placeholder="• Describe numbers or concrete outcomes when you can"
        toolbarRight={
          hasContent ? (
            <button
              type="button"
              onClick={improve}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ai-from)] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              {loading && improved ? "Improving…" : "Improve with AI"}
            </button>
          ) : undefined
        }
      />

      {ideas.length > 0 && (
        <div className="mt-3">
          {improved && (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ai-from)]">
              <Sparkles className="size-3.5" />
              Improved bullet points
            </p>
          )}
          <ul className="divide-y divide-border">
            {ideas.map((idea, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => insert(idea)}
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
            {loading && !improved ? "Loading…" : "Show more ideas"}
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

  // Start with one empty entry so the form isn't blank.
  useEffect(() => {
    if (useResumeStore.getState().employment.length === 0) addEmployment();
  }, [addEmployment]);

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

        <AddMoreButton
          label="Add another experience"
          onClick={addEmployment}
        />
      </div>
    </div>
  );
}
