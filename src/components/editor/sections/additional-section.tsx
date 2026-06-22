"use client";

import { useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import {
  useResumeStore,
  type AdditionalSection as TAdditionalSection,
  type AdditionalEntry,
} from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { ADDITIONAL_CONFIG, type FieldDef } from "./additional-config";
import { JOB_TITLES, LOCATIONS, INSTITUTIONS } from "@/lib/suggestions";

/** Maps a field's `suggest` kind to its static autocomplete list. */
const SUGGEST_LISTS = {
  jobTitle: JOB_TITLES,
  location: LOCATIONS,
  institution: INSTITUTIONS,
};

/** Renders the right input control for a field based on its declared `type`. */
function FieldControl({
  field,
  value,
  onChange,
  min,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  if (field.type === "rich") {
    return (
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        minHeight={90}
      />
    );
  }
  if (field.type === "monthYear") {
    return (
      <MonthYearPicker
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        allowPresent={field.present}
        min={field.present ? min : undefined}
      />
    );
  }
  if (field.type === "autocomplete") {
    return (
      <AutocompleteInput
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        options={SUGGEST_LISTS[field.suggest ?? "jobTitle"]}
        aiKind={field.suggest ?? "jobTitle"}
      />
    );
  }
  if (field.type === "select") {
    return (
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange((v as string) ?? "")}
      >
        <SelectTrigger className="h-12 w-full rounded-xl bg-card">
          <SelectValue placeholder={field.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="h-12 rounded-xl bg-card"
    />
  );
}

/** Lays out one entry's fields on a 12-col grid per the section's config. */
function EntryFields({
  section,
  entry,
}: {
  section: TAdditionalSection;
  entry: AdditionalEntry;
}) {
  const cfg = ADDITIONAL_CONFIG[section.type];
  const update = useResumeStore((s) => s.updateAdditionalEntry);
  const endError = isEndBeforeStart(entry.startDate ?? "", entry.endDate ?? "");

  return (
    <div className="grid grid-cols-12 gap-4">
      {cfg.fields.map((field) => (
        <div
          key={field.key}
          className="space-y-1.5"
          style={{ gridColumn: `span ${field.span ?? 12} / span ${field.span ?? 12}` }}
        >
          {field.label && (
            <Label className="text-sm text-muted-foreground">{field.label}</Label>
          )}
          <FieldControl
            field={field}
            value={entry[field.key] ?? ""}
            onChange={(v) => update(section.id, entry.id, { [field.key]: v })}
            min={entry.startDate}
          />
        </div>
      ))}
      {endError && (
        <p className="col-span-12 -mt-1 text-sm text-destructive">
          End date can&apos;t be before the start date.
        </p>
      )}
    </div>
  );
}

/**
 * Generic editor for any additional section (internships, languages, hobbies…).
 * Config-driven: a renamable/deletable title plus either a single body
 * (hobbies) or a list of repeatable entry cards.
 */
export function AdditionalSectionForm({
  section,
}: {
  section: TAdditionalSection;
}) {
  const cfg = ADDITIONAL_CONFIG[section.type];
  const updateTitle = useResumeStore((s) => s.updateAdditionalTitle);
  const removeSection = useResumeStore((s) => s.removeAdditionalSection);
  const addEntry = useResumeStore((s) => s.addAdditionalEntry);
  const removeEntry = useResumeStore((s) => s.removeAdditionalEntry);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  const [editingTitle, setEditingTitle] = useState(false);

  const firstField = cfg.fields[0];

  return (
    <div>
      {/* Title row (renamable + deletable) */}
      <div className="mb-2 flex items-center gap-2">
        {editingTitle ? (
          <Input
            autoFocus
            value={section.title}
            onChange={(e) => updateTitle(section.id, e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
            className="h-10 max-w-xs rounded-lg text-2xl font-extrabold"
          />
        ) : (
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {section.title}
          </h1>
        )}
        <button
          onClick={() => setEditingTitle((v) => !v)}
          aria-label="Rename section"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {editingTitle ? <Check className="size-4" /> : <Pencil className="size-4" />}
        </button>
        <button
          onClick={() => removeSection(section.id)}
          aria-label="Delete section"
          className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <p className="mb-6 text-muted-foreground">{cfg.description}</p>

      {cfg.single ? (
        // Hobbies: single body, no entry cards
        <FieldControl
          field={firstField}
          value={section.entries[0]?.[firstField.key] ?? ""}
          onChange={(v) =>
            useResumeStore
              .getState()
              .updateAdditionalEntry(section.id, section.entries[0].id, {
                [firstField.key]: v,
              })
          }
        />
      ) : (
        <div className="space-y-4">
          {section.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              title={
                entry[cfg.fields[0].key] ||
                entry.name ||
                entry.title ||
                "Untitled"
              }
              subtitle={entry[cfg.fields[1]?.key]}
              onDelete={() => removeEntry(section.id, entry.id)}
              onActivate={() => setActiveEntryId(entry.id)}
            >
              <EntryFields section={section} entry={entry} />
            </EntryCard>
          ))}

          <AddMoreButton
            label={cfg.addLabel}
            onClick={() => addEntry(section.id)}
          />
        </div>
      )}
    </div>
  );
}
