"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LinkedInIcon } from "@/components/brand/source-icons";

const cancelBtn =
  "flex-1 rounded-full bg-muted py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/70";
const primaryBtn =
  "flex-1 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50";

/**
 * Google Drive consent gate ("Your privacy matters"). On consent the caller
 * launches the real Google account chooser via NextAuth's signIn("google").
 */
export function GoogleConsentDialog({
  open,
  onOpenChange,
  onConsent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConsent: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 pt-8 sm:max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className="grid size-20 place-items-center rounded-full bg-primary/10"
            aria-hidden
          >
            <ShieldCheck className="size-9 text-primary" />
          </span>
          <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Your privacy matters
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            We&apos;d like to share some of your Google data with trusted AI
            companies to improve your experience with personalized AI features and
            better service quality. To proceed, please provide your consent.
          </DialogDescription>
        </div>

        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => onOpenChange(false)} className={cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={onConsent} className={primaryBtn}>
            I consent
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * LinkedIn import ("LinkedIn profile link:"). The caller turns the URL into a
 * resume draft.
 */
export function LinkedInImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const valid = url.trim().toLowerCase().includes("linkedin.com/in/");

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) setUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="rounded-2xl p-6 pt-8 sm:max-w-md">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <LinkedInIcon className="size-10" />
          <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            LinkedIn profile link:
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create your resume out of your profile
          </DialogDescription>
        </div>

        <div className="mt-4">
          <label
            htmlFor="linkedin-url"
            className="mb-1.5 block text-sm text-muted-foreground"
          >
            LinkedIn profile link:
          </label>
          <input
            id="linkedin-url"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) onImport(url.trim());
            }}
            placeholder="https://www.linkedin.com/in/username/"
            className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/20"
          />
          {url.trim() && !valid && (
            <p className="mt-1.5 text-xs text-destructive">
              Enter a full profile link, e.g. linkedin.com/in/your-name
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => close(false)} className={cancelBtn}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => valid && onImport(url.trim())}
            className={primaryBtn}
          >
            Import my resume
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
