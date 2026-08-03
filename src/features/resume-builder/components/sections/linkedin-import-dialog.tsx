"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LinkedInIcon } from "@/components/common/brand/source-icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/common/dialog";
import { useResumeStore, type ContactInfo } from "@/features/resume-builder/store/resume-store";
import { parseResume } from "@/services/ai/parseResume";
import { cn } from "@/utilities/utils";

/** The three steps of exporting a LinkedIn profile, in LinkedIn's own wording. */
const STEPS = [
  "Open your LinkedIn profile and choose More.",
  "Pick Save to PDF and wait for the download.",
  "Drop that PDF here and we fill the rest in.",
];

/**
 * "Fill your resume from LinkedIn" import.
 *
 * LinkedIn has no public API for reading a profile, and the page cannot be
 * fetched from the browser, so a genuine one-click pull is not possible. What
 * IS possible, and is what LinkedIn itself recommends, is the profile PDF
 * export - we parse that with the same extractor the upload flow uses, which
 * reads the candidate's real details rather than inventing any.
 */
export function LinkedInImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful import (e.g. to route into the editor). */
  onImported?: () => void;
}) {
  const hydrate = useResumeStore((s) => s.hydrate);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Parse the exported profile and merge it into the current draft. */
  async function importFile(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const parsed = await parseResume(file);
      // Keep the contact details the user already typed - they were editing this
      // very section, and the export often carries a stale email.
      const current = useResumeStore.getState().contact;
      hydrate({
        ...parsed,
        contact: { ...parsed.contact!, ...pickFilled(current) },
      });
      onOpenChange(false);
      toast.success("Imported from LinkedIn", {
        description: "Check each section - we kept the contact details you entered.",
      });
      onImported?.();
    } catch {
      toast.error("We couldn't read that export", {
        description:
          "Make sure it is the PDF LinkedIn generated. You can also paste the details in by hand.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-md">
        <DialogTitle className="flex items-center gap-2.5 font-heading text-xl font-extrabold tracking-tight text-foreground">
          <LinkedInIcon className="size-5" aria-hidden />
          Fill your resume from LinkedIn
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          LinkedIn does not let apps read your profile directly. Export it once and
          we do the rest.
        </DialogDescription>

        <ol className="mt-1 space-y-2">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-foreground">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            importFile(file);
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            importFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !busy && fileRef.current?.click()}
          className={cn(
            "mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          {busy ? (
            <Loader2 className="size-7 animate-spin text-primary" />
          ) : (
            <FileUp className="size-7 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {busy ? (
              "Reading your profile…"
            ) : (
              <>
                Drop your LinkedIn PDF here or{" "}
                <span className="font-semibold text-primary">choose the file</span>
              </>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={busy}
          className="mt-4 h-12 w-full rounded-full bg-muted text-sm font-bold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
        >
          Cancel
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Only the contact fields the user actually filled in, so blanks don't win. */
function pickFilled(contact: ContactInfo): Partial<ContactInfo> {
  return Object.fromEntries(
    Object.entries(contact).filter(([, v]) => v.trim())
  ) as Partial<ContactInfo>;
}
