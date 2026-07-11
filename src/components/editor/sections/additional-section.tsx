"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EditableSectionHeading } from "./field";
import { EntryCard, AddMoreButton } from "./entry-card";
import { RichTextEditor } from "../rich-text-editor";
import { AutocompleteInput } from "./autocomplete-input";
import { MonthYearPicker, isEndBeforeStart } from "./month-year-picker";
import { ADDITIONAL_CONFIG, type FieldDef } from "./additional-config";
import { titleCase } from "@/lib/title-case";
import {
  emailError,
  phoneError,
  sanitizePhone,
  formatPhone,
} from "@/lib/contact-validate";
import { urlError } from "@/lib/url";
import {
  JOB_TITLES,
  LOCATION_SUGGESTIONS,
  INSTITUTIONS,
} from "@/lib/suggestions";

/** Maps a field's `suggest` kind to its static autocomplete list. */
const SUGGEST_LISTS = {
  jobTitle: JOB_TITLES,
  location: LOCATION_SUGGESTIONS,
  institution: INSTITUTIONS,
};

/**
 * The inline error for a field, or "" when it has nothing to say.
 * `touched` gates the "required" message so a brand-new blank card never opens
 * covered in red - the section is optional, after all.
 */
export function fieldError(field: FieldDef, value: string, touched: boolean): string {
  const v = (value ?? "").trim();
  if (!v) {
    return field.required && touched ? "Please enter a valid phone number." : "";
  }
  if (field.validate === "email") return emailError(v);
  if (field.validate === "phone") return phoneError(v);
  if (field.validate === "url") return urlError(v);
  return "";
}

/** Renders the right input control for a field based on its declared `type`. */
function FieldControl({
  field,
  value,
  onChange,
  onBlur,
  min,
  id,
  invalid,
  describedBy,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  min?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  // Job titles read as proper nouns on a resume: "product designer" -> "Product Designer".
  // A phone can never hold junk: strip everything but digits and a leading plus.
  const commit = (v: string) => {
    if (field.validate === "phone") return onChange(sanitizePhone(v));
    onChange(field.titleCase ? titleCase(v) : v);
  };

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
        id={id}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        allowPresent={field.present}
        min={min}
      />
    );
  }
  if (field.type === "autocomplete") {
    return (
      <AutocompleteInput
        id={id}
        value={value}
        onChange={commit}
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
        <SelectTrigger id={id} className="h-12 w-full rounded-xl bg-card">
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
  const inputType =
    field.validate === "email"
      ? "email"
      : field.validate === "phone"
        ? "tel"
        : field.validate === "url"
          ? "url"
          : "text";

  return (
    <Input
      id={id}
      type={inputType}
      inputMode={field.validate === "phone" ? "tel" : undefined}
      autoComplete={field.validate === "email" ? "email" : undefined}
      value={value}
      onChange={(e) => commit(e.target.value)}
      onBlur={() => {
        // Group the digits once the user is done typing: "+13052062368"
        // becomes "+1 305 206 2368". Reformatting mid-keystroke fights the caret.
        if (field.validate === "phone" && value.trim()) onChange(formatPhone(value));
        onBlur?.();
      }}
      placeholder={field.placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        "h-12 rounded-xl bg-card",
        invalid && "border-destructive focus-visible:ring-destructive/30"
      )}
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
  // Which fields the user has left at least once - a required field only
  // complains after it has been visited, never on a freshly added card.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  return (
    <div className="grid grid-cols-12 gap-4">
      {cfg.fields.map((field) => {
        const id = `${entry.id}-${field.key}`;
        const value = entry[field.key] ?? "";
        const error = fieldError(field, value, !!touched[field.key]);
        return (
          <div
            key={field.key}
            className="space-y-1.5"
            style={{ gridColumn: `span ${field.span ?? 12} / span ${field.span ?? 12}` }}
          >
            {field.label && (
              <Label htmlFor={id} className="text-sm text-muted-foreground">
                {field.label}
              </Label>
            )}
            <FieldControl
              id={id}
              field={field}
              value={value}
              onChange={(v) => update(section.id, entry.id, { [field.key]: v })}
              onBlur={() => setTouched((t) => ({ ...t, [field.key]: true }))}
              min={field.minKey ? entry[field.minKey] : undefined}
              invalid={!!error}
              describedBy={error ? `${id}-error` : undefined}
            />
            {error && (
              <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}
      {endError && (
        <p role="alert" className="col-span-12 -mt-1 text-sm text-destructive">
          End date can&apos;t be before the start date.
        </p>
      )}
    </div>
  );
}

/** Join the configured keys, skipping the ones the user hasn't filled yet. */
const joinKeys = (entry: AdditionalEntry, keys: string[] | undefined, sep: string) =>
  (keys ?? [])
    .map((k) => (entry[k] ?? "").trim())
    .filter(Boolean)
    .join(sep);

/**
 * Generic editor for any additional section (internships, languages, hobbies…).
 * Config-driven: a renamable/deletable heading plus either a single body
 * (hobbies) or a list of repeatable entry cards.
 *
 * Entry cards behave exactly like Employment history: dynamic headers, drag to
 * reorder, instant delete with an undo, independent expand/collapse.
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
  const insertEntry = useResumeStore((s) => s.insertAdditionalEntry);
  const reorderEntries = useResumeStore((s) => s.reorderAdditionalEntries);
  const setActiveEntryId = useResumeStore((s) => s.setActiveEntryId);

  // Independent, not an accordion: adding a second entry must not collapse the
  // one being edited.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const didInit = useRef(false);

  // A section must always own at least one entry. A single-body section
  // (Hobbies) writes straight into entries[0], so an empty list - which a
  // resume saved without its `entries` key rehydrates as - would throw on
  // every keystroke and silently drop what the user typed.
  //
  // The ref makes this run once per section: the effect fires again before the
  // added entry lands in state, and a second blank entry would show up as a
  // phantom card in the sections that render cards.
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (section.entries.length === 0 && seeded.current !== section.id) {
      seeded.current = section.id;
      addEntry(section.id);
    }
  }, [section.entries.length, section.id, addEntry]);

  // Expand the first entry once, when the section opens.
  useEffect(() => {
    if (!didInit.current && section.entries.length > 0) {
      didInit.current = true;
      setOpenIds([section.entries[0].id]);
    }
  }, [section.entries]);

  useEffect(() => () => setActiveEntryId(null), [setActiveEntryId]);

  const firstField = cfg.fields[0];

  /** Append a blank card and open it, leaving the others as they were. */
  function handleAdd() {
    const id = addEntry(section.id);
    setOpenIds((ids) => [...ids, id]);
  }

  /** Delete one entry immediately, with an undo that restores its position. */
  function handleDeleteEntry(entry: AdditionalEntry) {
    const index = section.entries.findIndex((e) => e.id === entry.id);
    removeEntry(section.id, entry.id);
    setOpenIds((ids) => ids.filter((id) => id !== entry.id));
    toast.success("Successfully deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          insertEntry(section.id, entry, index);
          setOpenIds((ids) => [...ids, entry.id]);
        },
      },
    });
  }

  function commitDrop() {
    if (dragIndex !== null && overIndex !== null)
      reorderEntries(section.id, dragIndex, overIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  function move(index: number, dir: "up" | "down") {
    const to = dir === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= section.entries.length) return;
    reorderEntries(section.id, index, to);
  }

  const sectionName = section.title || cfg.title;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableSectionHeading
            title={section.title}
            fallback={cfg.title}
            onChange={(t) => updateTitle(section.id, t)}
            description={cfg.description}
          />
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete the ${sectionName} section`}
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {cfg.single ? (
        // Hobbies: a single body, no entry cards. Read the entry id at write
        // time rather than from a render-time snapshot, so a keystroke that
        // lands before the seeding effect commits still finds its target.
        <FieldControl
          field={firstField}
          value={section.entries[0]?.[firstField.key] ?? ""}
          onChange={(v) => {
            const store = useResumeStore.getState();
            const entryId = store.additional.find((a) => a.id === section.id)
              ?.entries[0]?.id;
            if (!entryId) return;
            store.updateAdditionalEntry(section.id, entryId, {
              [firstField.key]: v,
            });
          }}
        />
      ) : (
        <div className="space-y-4">
          {section.entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              title={joinKeys(entry, cfg.titleKeys, ", ") || "Untitled"}
              subtitle={joinKeys(entry, cfg.subtitleKeys, " - ")}
              deleteLabel={`Delete ${
                joinKeys(entry, cfg.titleKeys, ", ") || `this ${cfg.label.toLowerCase()} entry`
              }`}
              onDelete={() => handleDeleteEntry(entry)}
              open={openIds.includes(entry.id)}
              onToggle={() =>
                setOpenIds((ids) =>
                  ids.includes(entry.id)
                    ? ids.filter((id) => id !== entry.id)
                    : [...ids, entry.id]
                )
              }
              onActivate={() => setActiveEntryId(entry.id)}
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
              <EntryFields section={section} entry={entry} />
            </EntryCard>
          ))}

          <AddMoreButton label={cfg.addLabel} onClick={handleAdd} />
        </div>
      )}

      {/* Whole-section delete confirmation. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl p-6 pt-8 sm:max-w-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <span
              className="grid size-20 place-items-center rounded-full bg-destructive/10"
              aria-hidden
            >
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
              onClick={() => {
                setConfirmOpen(false);
                removeSection(section.id);
              }}
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
