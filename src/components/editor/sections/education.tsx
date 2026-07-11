"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore, type EducationEntry } from "@/lib/store/resume-store";
import { Field, FieldWrap, EditableSectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { INSTITUTIONS, LOCATION_SUGGESTIONS } from "@/lib/suggestions";
import { titleCase } from "@/lib/title-case";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Join start/end into a "start - end" range, skipping blanks. */
const dateRange = (a: string, b: string) => [a, b].filter(Boolean).join(" - ");

/**
 * Editor section for education entries - repeatable cards with institution,
 * degree, date range, location and optional academic details.
 *
 * Cards open and close independently (adding one leaves the card you were
 * editing expanded), can be dragged to reorder, and delete instantly with an
 * undo. The whole section can be removed and restored from Additional sections.
 */
export function EducationForm() {
  const education = useResumeStore((s) => s.education);
  const educationTitle = useResumeStore((s) => s.educationTitle);
  const setEducationTitle = useResumeStore((s) => s.setEducationTitle);
  const addEducation = useResumeStore((s) => s.addEducation);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);
  const insertEducation = useResumeStore((s) => s.insertEducation);
  const reorderEducation = useResumeStore((s) => s.reorderEducation);
  const removeSection = useResumeStore((s) => s.removeSection);
  const restoreSection = useResumeStore((s) => s.restoreSection);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  // Which cards are expanded. Independent, not an accordion: adding a second
  // entry must not collapse the one being edited.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const didInit = useRef(false);

  // Start with one empty entry so the form isn't blank.
  useEffect(() => {
    if (!didInit.current && useResumeStore.getState().education.length === 0) {
      addEducation();
    }
  }, [addEducation]);

  // Expand the first entry once, after entries exist.
  useEffect(() => {
    if (!didInit.current && education.length > 0) {
      didInit.current = true;
      setOpenIds([education[0].id]);
    }
  }, [education]);

  // Clear the inner-entry cursor when leaving the section.
  useEffect(() => () => setActiveEntryId(null), [setActiveEntryId]);

  /** Add a blank card below the others, left collapsed and titled "Untitled". */
  function handleAdd() {
    addEducation();
  }

  /** Delete one entry immediately, with an undo that restores its position. */
  function handleDeleteEntry(entry: EducationEntry) {
    const index = useResumeStore.getState().education.findIndex((e) => e.id === entry.id);
    removeEducation(entry.id);
    setOpenIds((ids) => ids.filter((id) => id !== entry.id));
    toast.success("Successfully deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          insertEducation(entry, index);
          setOpenIds((ids) => [...ids, entry.id]);
        },
      },
    });
  }

  /** Remove the whole section from the resume, with an undo. */
  function handleDeleteSection() {
    setConfirmOpen(false);
    removeSection("education");
    setActiveSection("personal");
    toast.success("Education removed", {
      duration: 6000,
      description: "You can add it back from Additional sections.",
      action: {
        label: "Undo",
        onClick: () => {
          restoreSection("education");
          setActiveSection("education");
        },
      },
    });
  }

  function commitDrop() {
    if (dragIndex !== null && overIndex !== null) reorderEducation(dragIndex, overIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  function move(index: number, dir: "up" | "down") {
    const to = dir === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= education.length) return;
    reorderEducation(index, to);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableSectionHeading
            title={educationTitle}
            fallback="Education"
            onChange={setEducationTitle}
            description="Add your education. Include relevant courses or other details if they support the role."
          />
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete the education section"
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        {education.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.degree, e.institution].filter(Boolean).join(", ") || "Untitled"}
            subtitle={dateRange(e.startDate, e.endDate)}
            deleteLabel={`Delete ${e.degree || e.institution || "this education entry"}`}
            onDelete={() => handleDeleteEntry(e)}
            open={openIds.includes(e.id)}
            onToggle={() =>
              setOpenIds((ids) =>
                ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id]
              )
            }
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
              <FieldWrap label="Institution">
                <AutocompleteInput
                  value={e.institution}
                  // Title-case as they type: "harvard" -> "Harvard".
                  onChange={(v) => updateEducation(e.id, { institution: titleCase(v) })}
                  placeholder="e.g., Harvard University"
                  options={INSTITUTIONS}
                />
              </FieldWrap>
              {/* Degree is a plain input: no AI suggestions here. */}
              <Field
                label="Degree"
                value={e.degree}
                onChange={(v) => updateEducation(e.id, { degree: v })}
                placeholder="e.g., Bachelor's in Management"
              />
            </div>

            {/* Two date pickers side by side need ~360px; stack below that. */}
            <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3">
              <FieldWrap label="Start date">
                <MonthYearPicker
                  value={e.startDate}
                  onChange={(v) => updateEducation(e.id, { startDate: v })}
                  placeholder="Jan 2016"
                />
              </FieldWrap>
              <FieldWrap label="End date">
                <MonthYearPicker
                  value={e.endDate}
                  onChange={(v) => updateEducation(e.id, { endDate: v })}
                  placeholder="Feb 2019"
                  allowPresent
                  min={e.startDate}
                />
              </FieldWrap>
              <FieldWrap label="Location">
                <AutocompleteInput
                  value={e.location}
                  onChange={(v) => updateEducation(e.id, { location: v })}
                  placeholder="e.g., Washington, D.C."
                  options={LOCATION_SUGGESTIONS}
                />
              </FieldWrap>
            </div>

            {isEndBeforeStart(e.startDate, e.endDate) && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                End date can&apos;t be before the start date.
              </p>
            )}

            <div className="mt-4">
              <RichTextEditor
                value={e.description}
                onChange={(html) => updateEducation(e.id, { description: html })}
                placeholder="GPA 3.5. Leader of the Business club."
                minHeight={90}
              />
            </div>
          </EntryCard>
        ))}

        <AddMoreButton label="Add one more" onClick={handleAdd} />
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
