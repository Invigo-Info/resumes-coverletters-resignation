"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LinkedInIcon } from "@/components/brand/source-icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useResumeStore } from "@/lib/store/resume-store";
import { parseResumeText } from "@/services/ai/parseResume";
import { cn } from "@/lib/utils";

/** Accepts a linkedin.com/in/<handle> URL (optional country subdomain / trailing bits). */
const PROFILE_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^/\s?#]+/i;

/**
 * "LinkedIn profile link" import.
 *
 * The user pastes their public profile URL and we build a resume from it. There
 * is no LinkedIn profile API, so we do the honest best-effort: the server fetches
 * the public page and the same AI extractor the upload flow uses reads the real
 * details. If the profile isn't publicly readable, we still start the resume with
 * the name from the profile handle and open the editor to fill in the rest -
 * nothing about the candidate is invented.
 */
export function LinkedInLinkDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the draft is seeded (e.g. to route into the editor). */
  onImported?: () => void;
}) {
  const hydrate = useResumeStore((s) => s.hydrate);
  const reset = useResumeStore((s) => s.reset);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importProfile() {
    const value = url.trim();
    if (!PROFILE_RE.test(value)) {
      setError("Enter a valid LinkedIn profile link, like linkedin.com/in/username.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // 1. Try the real import: fetch the public page, extract with the same AI.
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (res.ok && data.text) {
        const parsed = await parseResumeText(data.text);
        reset(); // fresh draft (new id) so we never overwrite another
        hydrate(parsed);
        finish("Imported from LinkedIn", "Check each section and add anything we missed.");
        return;
      }
      throw new Error(data.error ?? "unreadable");
    } catch {
      // 2. Fallback: the public profile wasn't readable (private / login wall).
      // Seed the name from the handle the user gave us and open the editor.
      const { firstName, lastName } = nameFromUrl(value);
      reset();
      hydrate({
        personal: {
          firstName,
          lastName,
          jobTitle: "",
          nationality: "",
          driverLicense: "",
          birthDate: "",
        },
      });
      finish(
        "Let's build your LinkedIn resume",
        "We couldn't read that profile automatically - add your details and we'll help polish them."
      );
    }
  }

  function finish(title: string, description: string) {
    setBusy(false);
    setUrl("");
    onOpenChange(false);
    toast.success(title, { description });
    onImported?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="rounded-2xl p-7 sm:max-w-md">
        <div className="flex flex-col items-center text-center">
          <LinkedInIcon className="size-9" aria-hidden />
          <DialogTitle className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-foreground">
            LinkedIn profile link:
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Create your resume out of your profile
          </DialogDescription>
        </div>

        <div className="mt-6">
          <label
            htmlFor="linkedin-url"
            className="mb-1.5 block text-sm font-medium text-muted-foreground"
          >
            LinkedIn profile link:
          </label>
          <input
            id="linkedin-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={url}
            disabled={busy}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") importProfile();
            }}
            placeholder="https://www.linkedin.com/in/username/"
            aria-invalid={!!error}
            aria-describedby={error ? "linkedin-url-error" : undefined}
            className={cn(
              "h-12 w-full rounded-xl border bg-card px-4 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 disabled:opacity-60",
              error ? "border-destructive focus:ring-destructive/30" : "border-border focus:border-primary"
            )}
          />
          {error && (
            <p id="linkedin-url-error" className="mt-1.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="h-12 rounded-full bg-muted px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={importProfile}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Importing…" : "Import my resume"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Derive a display name from a LinkedIn profile URL. The handle usually IS the
 * person's name (john-mayer), with a trailing disambiguation token (a2b3c4) that
 * we drop. This uses only what the user typed - it invents nothing.
 */
function nameFromUrl(url: string): { firstName: string; lastName: string } {
  const m = url.match(/\/in\/([^/?#]+)/i);
  const handle = m ? decodeURIComponent(m[1]) : "";
  const words = handle
    .split(/[-_]+/)
    .filter((w) => w && !/\d/.test(w)) // drop LinkedIn's numeric/alphanumeric suffix
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return {
    firstName: words[0] ?? "",
    lastName: words.slice(1).join(" "),
  };
}
