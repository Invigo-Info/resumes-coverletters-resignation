"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import type { ResignationLetterDoc } from "@/lib/resignation-letter/mock-data";
import { cn } from "@/lib/utils";

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

/** Scaled-down letterhead preview (light or dark), matching Step 1.png cards. */
function MiniLetter({ doc }: { doc: ResignationLetterDoc }) {
  const dark = doc.theme === "dark";
  return (
    <div
      className={cn(
        "h-[160px] w-[120px] overflow-hidden rounded-lg p-3 ring-1",
        dark ? "bg-neutral-900 text-white ring-neutral-800" : "bg-white text-neutral-900 ring-border"
      )}
      aria-hidden
    >
      <p className="font-heading text-[7px] font-bold leading-tight">Resignation Letter</p>
      <p className="mt-0.5 text-[5px] font-semibold">{doc.name}</p>
      {doc.preview.recipient && (
        <div className="mt-1 space-y-px">
          {doc.preview.recipient.map((line, i) => (
            <p key={i} className="text-[4px] leading-tight opacity-90">
              {line}
            </p>
          ))}
        </div>
      )}
      <p className="mt-1 text-[4px] opacity-90">{doc.preview.date}</p>
      <p className="mt-1 text-[4px] leading-[1.4] opacity-80 line-clamp-6">{doc.preview.body}</p>
    </div>
  );
}

export function ResignationLetterCard({
  doc,
  onEdit,
  onDownload,
  onCopy,
  onDelete,
}: {
  doc: ResignationLetterDoc;
  onEdit?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const openPreview = () => router.push("/resignation-letter/preview");

  return (
    <div className="rounded-3xl bg-card p-3 shadow-card-lg">
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-7">
        {/* Thumbnail */}
        <div className="shrink-0">
          <MiniLetter doc={doc} />
        </div>

        {/* Details + actions */}
        <div className="flex flex-1 flex-col">
          <h2 className="text-lg font-bold text-foreground">{doc.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{doc.updatedAt}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              className="text-primary hover:bg-secondary"
              onClick={onDownload ?? openPreview}
            >
              <Download className="size-4" />
              Download
            </ActionButton>
            <ActionButton onClick={onEdit ?? openPreview}>Edit</ActionButton>
            <ActionButton onClick={onCopy} disabled={!onCopy}>
              Copy
            </ActionButton>
            <ActionButton onClick={onDelete} disabled={!onDelete}>
              Delete
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
