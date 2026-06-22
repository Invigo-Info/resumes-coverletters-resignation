"use client";

import { useEffect } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Field, FieldWrap, SectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { INSTITUTIONS, LOCATIONS } from "@/lib/suggestions";

/**
 * Editor section for education entries — repeatable cards with institution,
 * degree, date range, location and a description.
 */
export function EducationForm() {
  const education = useResumeStore((s) => s.education);
  const addEducation = useResumeStore((s) => s.addEducation);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  // Start with one empty entry so the form isn't blank.
  useEffect(() => {
    if (useResumeStore.getState().education.length === 0) addEducation();
  }, [addEducation]);

  // Clear the inner-entry cursor when leaving the section.
  useEffect(() => () => setActiveEntryId(null), [setActiveEntryId]);

  return (
    <div>
      <SectionHeading
        title="Education"
        description="Add your education. Include relevant courses or other details if they support the role."
      />

      <div className="space-y-4">
        {education.map((e) => (
          <EntryCard
            key={e.id}
            title={[e.degree, e.institution].filter(Boolean).join(", ") || "Untitled"}
            subtitle={[e.startDate, e.endDate].filter(Boolean).join(" – ")}
            onDelete={() => removeEducation(e.id)}
            onActivate={() => setActiveEntryId(e.id)}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Institution">
                <AutocompleteInput
                  value={e.institution}
                  onChange={(v) => updateEducation(e.id, { institution: v })}
                  placeholder="Harvard University"
                  options={INSTITUTIONS}
                  aiKind="institution"
                />
              </FieldWrap>
              <FieldWrap label="Degree">
                <AutocompleteInput
                  value={e.degree}
                  onChange={(v) => updateEducation(e.id, { degree: v })}
                  placeholder="Bachelor's in Management"
                  options={[]}
                  aiKind="degree"
                />
              </FieldWrap>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
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

        <AddMoreButton label="Add one more" onClick={addEducation} />
      </div>
    </div>
  );
}
