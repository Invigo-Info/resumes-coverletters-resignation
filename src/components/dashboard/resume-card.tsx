"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { ResumeDoc } from "@/lib/mock-data";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { cn } from "@/lib/utils";
import { TailorDialog } from "./tailor-dialog";
import { ShareDialog, buildShareUrl } from "@/components/share/share-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Visual weight for the card's action row. Download and Edit are the two
 * most-used actions so they carry the most weight; Copy and Share sit quietly
 * behind them; Delete is the quietest and uses the destructive role (matching
 * its confirmation dialog) rather than reading as just another neutral pill.
 */
type ActionVariant = "primary" | "secondary" | "quiet" | "danger";

const ACTION_VARIANTS: Record<ActionVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary:
    "bg-secondary text-foreground hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]",
  quiet: "text-muted-foreground ring-1 ring-border hover:bg-secondary hover:text-foreground",
  danger: "text-destructive hover:bg-destructive/10",
};

/** Pill-shaped action button used for the per-card row (Download, Edit, etc.). */
function ActionButton({
  children,
  className,
  disabled,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: ActionVariant;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        ACTION_VARIANTS[variant],
        disabled &&
          "cursor-not-allowed bg-secondary text-muted-foreground opacity-60 shadow-none ring-0 hover:bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * A single resume entry on the dashboard: thumbnail, metadata, the row of
 * document actions, the AI "tailor" banner, and the share/delete dialogs.
 * Action handlers are optional so the same card works for mock and real data.
 */
export function ResumeCard({
  resume,
  resumeBullets,
  onEdit,
  onDownload,
  onCopy,
  onDelete,
}: {
  resume: ResumeDoc;
  /** The candidate's real experience bullets, used to ground AI tailoring. */
  resumeBullets?: string[];
  onEdit?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const premium = usePaywall((s) => s.premium);
  // Local open/close state for each of the card's dialogs.
  const [tailorOpen, setTailorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // AI tailoring is a premium action: free users go to the subscribe funnel
  // first; premium users open the tailoring dialog directly. Mirrors the
  // download gate in /tailoring.
  function handleTailor() {
    if (!premium) {
      router.push("/payment");
      return;
    }
    setTailorOpen(true);
  }

  return (
    <div className="rounded-3xl bg-card p-3 shadow-card-lg">
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-7">
        {/* Thumbnail. Explicit width so the ring hugs the image; in the mobile
            flex-col it would otherwise stretch full-width (image stuck top-left).
            Centered on mobile, left-aligned once the card goes side-by-side. */}
        <div className="mx-auto w-[150px] shrink-0 overflow-hidden rounded-lg ring-1 ring-border sm:mx-0 md:w-[170px]">
          <Image
            src={resume.thumb}
            alt={`${resume.title} preview`}
            width={170}
            height={227}
            className="h-auto w-full object-cover"
          />
        </div>

        {/* Details + actions */}
        <div className="flex flex-1 flex-col">
          {/* Title scales down on narrow phones, up on wider screens. */}
          <h2 className="text-base font-bold text-foreground sm:text-lg md:text-xl">
            {resume.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {resume.updatedAt}
          </p>

          {/* Download and Edit lead; Copy and Share sit back; Delete is quietest. */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ActionButton
              variant="primary"
              onClick={onDownload ?? (() => router.push("/resumes/write/personal"))}
            >
              <Download className="size-4" />
              Download
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={onEdit ?? (() => router.push("/resumes/write/personal"))}
            >
              <Pencil className="size-4" />
              Edit
            </ActionButton>
            <ActionButton variant="quiet" onClick={onCopy} disabled={!onCopy}>
              Copy
            </ActionButton>
            <ActionButton variant="quiet" onClick={() => setShareOpen(true)}>
              Share
            </ActionButton>
            <ActionButton
              variant="danger"
              className="ml-auto"
              onClick={onDelete ? () => setConfirmOpen(true) : undefined}
              disabled={!onDelete}
            >
              Delete
            </ActionButton>
          </div>
        </div>
      </div>

      {/* AI banner */}
      <div className="m-1 flex flex-col items-start gap-4 rounded-2xl bg-[#F3F2FF] px-5 py-4 sm:flex-row sm:items-center">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-[#8B5CF6]" />
        <p className="flex-1 text-sm font-medium leading-snug text-[#4F46E5]">
          Customizing your resume for each specific job can significantly enhance
          your chances of getting an interview
        </p>
        <button
          onClick={handleTailor}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-ai px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Tailor this resume
          <span aria-hidden>→</span>
        </button>
      </div>

      <TailorDialog
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        resumeTitle={resume.title}
        resumeBullets={resumeBullets}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={buildShareUrl(resume.id)}
        label="resume"
      />

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
              Are you sure you want to delete this resume?
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
