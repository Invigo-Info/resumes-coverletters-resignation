"use client";

import { SlidersHorizontal, Briefcase, MapPin } from "lucide-react";
import {
  type JobFilters,
  DATE_POSTED_LABEL,
  WORK_MODEL_LABEL,
} from "@/lib/jobs/job-search";

/** A read-only filter chip on the page (click opens the Edit filters modal). */
function Chip({
  icon,
  children,
  onClick,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-foreground/20"
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * The active-filter chip row shown under the page heading. Reflects the applied
 * filters: Edit filters + job title(s) (with a +N collapse) + work model +
 * location + date posted. Clicking any chip opens the Edit filters modal.
 */
export function FilterChips({
  filters,
  onEdit,
}: {
  filters: JobFilters;
  onEdit: () => void;
}) {
  const [firstTitle, ...restTitles] = filters.jobTitles;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        icon={<SlidersHorizontal className="size-4 text-muted-foreground" />}
        onClick={onEdit}
      >
        <span className="font-medium">Filters</span>
      </Chip>

      {firstTitle && (
        <Chip
          icon={<Briefcase className="size-4 text-muted-foreground" />}
          onClick={onEdit}
        >
          {firstTitle}
          {restTitles.length > 0 && (
            <span className="ml-0.5 text-muted-foreground">+{restTitles.length}</span>
          )}
        </Chip>
      )}

      <Chip onClick={onEdit}>{WORK_MODEL_LABEL[filters.workModel]}</Chip>

      {filters.location && (
        <Chip
          icon={<MapPin className="size-4 text-muted-foreground" />}
          onClick={onEdit}
        >
          {filters.location}
        </Chip>
      )}

      <Chip onClick={onEdit}>{DATE_POSTED_LABEL[filters.datePosted]}</Chip>
    </div>
  );
}
