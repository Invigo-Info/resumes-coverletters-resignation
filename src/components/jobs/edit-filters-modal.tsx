"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/editor/sections/autocomplete-input";
import {
  type JobFilters,
  type DatePosted,
  type WorkModelFilter,
  DATE_POSTED_LABEL,
  WORK_MODEL_LABEL,
  defaultFilters,
  relatedTitles,
  activeFilterCount,
} from "@/lib/jobs/job-search";

/** A removable filter chip (job title / location). */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/** A single radio row inside a filter group. */
function RadioRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
      <span
        className={`grid size-4 place-items-center rounded-full border transition-colors ${
          checked ? "border-primary" : "border-border"
        }`}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

/**
 * The Edit filters modal - the control center for narrowing recommended jobs.
 * Holds a local draft; Apply is disabled until the draft differs from what's
 * applied. Reset restores the product default for the current role.
 */
export function EditFiltersModal({
  open,
  onOpenChange,
  role,
  applied,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  applied: JobFilters;
  onApply: (filters: JobFilters) => void;
}) {
  const [draft, setDraft] = useState<JobFilters>(applied);
  const [titleInput, setTitleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  // Re-seed the draft from the applied filters each time the modal opens.
  useEffect(() => {
    if (open) {
      setDraft(applied);
      setTitleInput("");
      setLocationInput(applied.location);
    }
  }, [open, applied]);

  const suggestions = useMemo(
    () => relatedTitles(role).filter((t) => !draft.jobTitles.includes(t)),
    [role, draft.jobTitles]
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const count = activeFilterCount(draft);

  // Unsaved-changes guard: closing while dirty asks before dropping the edits.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestClose = () => {
    if (dirty) setConfirmOpen(true);
    else onOpenChange(false);
  };
  const handleOpenChange = (next: boolean) => {
    if (next) onOpenChange(true);
    else requestClose();
  };
  const applyAndClose = () => {
    onApply(draft);
    setConfirmOpen(false);
    onOpenChange(false);
  };
  const discardAndClose = () => {
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const addTitle = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setDraft((d) =>
      d.jobTitles.some((x) => x.toLowerCase() === t.toLowerCase())
        ? d
        : { ...d, jobTitles: [...d.jobTitles, t] }
    );
    setTitleInput("");
  };
  const removeTitle = (t: string) =>
    setDraft((d) => ({ ...d, jobTitles: d.jobTitles.filter((x) => x !== t) }));

  const setLocation = (loc: string) => {
    setLocationInput(loc);
    setDraft((d) => ({ ...d, location: loc.trim() }));
  };
  const clearLocation = () => {
    setLocationInput("");
    setDraft((d) => ({ ...d, location: "" }));
  };

  const setDate = (datePosted: DatePosted) =>
    setDraft((d) => ({ ...d, datePosted }));
  const setWork = (workModel: WorkModelFilter) =>
    setDraft((d) => ({ ...d, workModel }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              Edit filters
            </DialogTitle>
            {count > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close filters"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Job titles */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Job titles</h3>
            {draft.jobTitles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {draft.jobTitles.map((t) => (
                  <Chip key={t} label={t} onRemove={() => removeTitle(t)} />
                ))}
              </div>
            )}
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTitle(titleInput);
                }
              }}
              placeholder="Enter title"
              className="h-12 rounded-xl bg-card"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTitle(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Location */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Location</h3>
            {draft.location && (
              <div className="mb-2 flex flex-wrap gap-2">
                <Chip label={draft.location} onRemove={clearLocation} />
              </div>
            )}
            <AutocompleteInput
              value={locationInput}
              onChange={setLocation}
              placeholder="Enter country or city"
              options={[]}
              aiKind="location"
            />
          </section>

          {/* Date posted */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Date posted</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(DATE_POSTED_LABEL) as DatePosted[]).map((d) => (
                <RadioRow
                  key={d}
                  name="date-posted"
                  label={DATE_POSTED_LABEL[d]}
                  checked={draft.datePosted === d}
                  onChange={() => setDate(d)}
                />
              ))}
            </div>
          </section>

          {/* Work model */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Work model</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              {(Object.keys(WORK_MODEL_LABEL) as WorkModelFilter[]).map((w) => (
                <RadioRow
                  key={w}
                  name="work-model"
                  label={WORK_MODEL_LABEL[w]}
                  checked={draft.workModel === w}
                  onChange={() => setWork(w)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => {
              const reset = defaultFilters(role);
              setDraft(reset);
              setLocationInput("");
            }}
            className="inline-flex h-10 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
          >
            Reset filters
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={applyAndClose}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            Apply filters
          </button>
        </div>

        {/* Unsaved-changes confirmation (shown when closing while dirty) */}
        {confirmOpen && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card-lg">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">Save new filters?</h3>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  aria-label="Keep editing"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                You changed your search filters. Apply the new set or keep your
                previous filters.
              </p>

              {/* Preview of the new filter set */}
              <div className="mt-4 flex flex-wrap gap-2">
                {draft.jobTitles.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
                  >
                    {t}
                  </span>
                ))}
                {draft.location && (
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                    {draft.location}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                  {WORK_MODEL_LABEL[draft.workModel]}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                  {DATE_POSTED_LABEL[draft.datePosted]}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={discardAndClose}
                  className="inline-flex h-10 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                >
                  Leave previous
                </button>
                <button
                  type="button"
                  onClick={applyAndClose}
                  className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Apply new
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
