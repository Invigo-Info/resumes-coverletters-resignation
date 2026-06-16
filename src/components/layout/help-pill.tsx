"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "How do I share my resume?",
    a: 'To share your resume, simply follow these two steps: Click the "Share" button located at the top right corner of the screen. Copy the sharing link by clicking the "Copy Link" button. That\'s it! You can now send that link to anyone — they will be able to view your resume in their browser without needing an account.',
  },
  {
    q: "What is the maximum number of unique resumes and cover letters that can be created?",
    a: "To get you started, we offer all users the ability to create up to 3 documents of each type (resumes and cover letters) for free. This way, you can test out our platform and see if it's the right fit before deciding to upgrade.",
  },
  {
    q: "Are Resume.co template configurations ATS-friendly?",
    a: "Every resume, CV, and cover letter template created on Resume.co is ATS-friendly. If you've used our resume builder to create an application document, rest assured that ATS will be able to scan and read your information correctly.",
  },
  {
    q: "How do I download my resume?",
    a: 'Open your resume, then click the "Download" button in the top right corner. Your resume is exported as a polished, print-ready PDF that you can attach to any job application.',
  },
  {
    q: "Can I edit my resume after creating it?",
    a: "Yes. Your progress is saved automatically as you work, so you can come back any time to update your details, switch templates, or restyle it from the Design tab.",
  },
  {
    q: "How do I change the design, font or colors?",
    a: "Open the Design tab while editing. There you can switch templates, choose a font and spacing, pick a single or two-column layout, and apply a color theme — every change previews instantly.",
  },
  {
    q: "Is my information secure?",
    a: "Your data is stored securely and is never sold or shared with third parties. You stay in control of who can see your resume through the share link you generate.",
  },
];

/** Persistent floating "Help" pill that opens an Instant Answers panel. */
export function HelpPill({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? FAQS.filter((f) => (f.q + " " + f.a).toLowerCase().includes(q))
    : FAQS;

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-120 max-h-[calc(100vh-7rem)] w-88 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl bg-card shadow-card-lg ring-1 ring-border">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">
              Instant Answers
            </p>
          </div>

          {/* FAQ list */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3">
            {filtered.length === 0 ? (
              <p className="px-2 py-10 text-center text-sm text-muted-foreground">
                No answers matched “{query}”. Try different keywords.
              </p>
            ) : (
              filtered.map((f) => {
                const idx = FAQS.indexOf(f);
                const isOpen = expanded === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-card p-4 shadow-card ring-1 ring-border"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : idx)}
                      className="block w-full text-left text-sm font-semibold text-primary"
                    >
                      {f.q}
                    </button>
                    <p
                      className={cn(
                        "mt-2 text-sm leading-relaxed text-muted-foreground",
                        !isOpen && "line-clamp-4"
                      )}
                    >
                      {f.a}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Search */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What can we help you with?"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Search className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "fixed bottom-5 right-5 z-50 rounded-full bg-card px-5 py-2.5 text-sm font-medium",
          "text-foreground shadow-card-lg ring-1 ring-border transition-transform hover:-translate-y-0.5",
          className
        )}
      >
        {open ? "Close" : "Help"}
      </button>
    </>
  );
}
