"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useInterviewPrepDocumentsStore } from "@/lib/store/interview-prep-documents-store";

/**
 * Small entry point to the saved-prep list, shown on the interview-prep index
 * only when the user has saved sheets. Mount-guarded so server and first client
 * render match (the count comes from localStorage, unavailable during SSR).
 */
export function SavedPrepLink() {
  const count = useInterviewPrepDocumentsStore((s) => s.sheets.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || count === 0) return null;

  return (
    <div className="mb-4 flex justify-end">
      <Link
        href="/interview-prep/saved"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bookmark className="size-4" aria-hidden />
        Saved prep ({count})
      </Link>
    </div>
  );
}
