"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import {
  CoverLetterMiniPreview,
  type CoverLetterPreviewData,
} from "@/components/cover-letter/cover-letter-preview";
import { cn } from "@/utilities/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Pill-style action button used for the card's Download/Edit/Copy/Share/Delete row. */
function ActionButton({
  children,
  className,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors",
        "hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]",
        disabled && "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * Dashboard list item for a saved cover letter: thumbnail, metadata, action row,
 * share dialog, and a delete-confirmation dialog.
 */
export function CoverLetterCard({
  title,
  updatedAt,
  data,
  onEdit,
  onDownload,
  onCopy,
  onDelete,
}: {
  title: string;
  updatedAt: string;
  data: CoverLetterPreviewData;
  onEdit?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-3xl bg-card p-3 shadow-card-lg">
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-7">
        {/* Thumbnail - a real, scaled-down render of the saved letter; opens it. */}
        <button
          type="button"
          onClick={onEdit}
          disabled={!onEdit}
          aria-label={`Open ${title}`}
          className={cn(
            "group relative h-[200px] w-[150px] shrink-0 overflow-hidden rounded-lg ring-1 ring-border transition-all",
            onEdit
              ? "cursor-pointer hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              : "cursor-default"
          )}
        >
          <CoverLetterMiniPreview data={data} width={150} />
          {onEdit && (
            <span className="pointer-events-none absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
          )}
        </button>

        {/* Details + actions */}
        <div className="flex flex-1 flex-col">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{updatedAt}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton className="text-primary hover:bg-secondary" onClick={onDownload}>
              <Download className="size-4" />
              Download
            </ActionButton>
            <ActionButton onClick={onEdit}>Edit</ActionButton>
            <ActionButton onClick={onCopy} disabled={!onCopy}>
              Copy
            </ActionButton>
            <ActionButton
              onClick={onDelete ? () => setConfirmOpen(true) : undefined}
              disabled={!onDelete}
            >
              Delete
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
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
              Are you sure you want to delete this cover letter?
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
                onDelete?.();
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
