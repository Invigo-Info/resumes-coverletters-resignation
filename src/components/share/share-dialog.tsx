"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, ChevronRight } from "lucide-react";
import { TwitterIcon, FacebookIcon, LinkedInIcon } from "@/components/brand/source-icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * A plausible public share link for a document (no backend — client only).
 * Uses the current origin (e.g. http://localhost:3001) so the link is valid in
 * whatever environment the app is running in, falling back to the prod domain
 * during SSR where `window` is unavailable.
 */
export function buildShareUrl(id: string): string {
  const token = (id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "share";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://resume.co";
  return `${origin}/@${token}`;
}

const SOCIALS: {
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  href: (url: string, text: string) => string;
}[] = [
  {
    label: "Twitter",
    icon: TwitterIcon,
    href: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    label: "Facebook",
    icon: FacebookIcon,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: "LinkedIn",
    icon: LinkedInIcon,
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

/**
 * "Share your <thing>" modal: a copyable public link plus one-click sharing to
 * Twitter, Facebook and LinkedIn. Matches the share design across all sections.
 */
export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  label = "resume",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  /** e.g. "resume", "cover letter" — used in the title/subtitle. */
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  function openShare(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
  }

  const shareText = `Check out my ${label}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl p-6 sm:max-w-lg">
        <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Share your {label}
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-base text-muted-foreground">
          Share your {label} with potential employers &amp; friends.
        </DialogDescription>

        {/* Copyable link */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4">
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{shareUrl}</span>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open link in a new tab"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          <Link href="/payment" className="font-medium text-primary hover:underline">
            Subscribe now
          </Link>{" "}
          to customize the sharing link.
        </p>

        {/* Social rows */}
        <div className="mt-5 border-t border-border">
          {SOCIALS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => openShare(s.href(shareUrl, shareText))}
                className="flex w-full items-center gap-3 border-b border-border py-4 text-left transition-colors hover:bg-muted/50"
              >
                <Icon className="size-5 shrink-0" />
                <span className="flex-1 text-base font-semibold text-primary">
                  Share on {s.label}
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
