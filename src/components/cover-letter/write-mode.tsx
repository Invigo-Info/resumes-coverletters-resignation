"use client";

import { useState } from "react";
import { UserRound, Mail, CircleCheck } from "lucide-react";
import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { bodyToHtml } from "@/lib/cover-letter/format";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLField } from "./widgets";
import { CoverLetterPreview } from "./cover-letter-preview";

type Section = "personal" | "content";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "personal", label: "Personal details", icon: <UserRound className="size-4" /> },
  { key: "content", label: "Letter content", icon: <Mail className="size-4" /> },
];

function PersonalSection() {
  const p = useCoverLetterStore((s) => s.personal);
  const jobTitle = useCoverLetterStore((s) => s.jobDetails.desiredJobTitle);
  const patch = useCoverLetterStore((s) => s.patchPersonal);
  const patchJob = useCoverLetterStore((s) => s.patchJobDetails);

  return (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-foreground">Personal details</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Add your name, your job title, and your contact details so the hiring
        manager can reach out to you.
      </p>
      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="First name" value={p.firstName} onChange={(v) => patch({ firstName: v })} placeholder="John" />
          <CLField label="Last name" value={p.lastName} onChange={(v) => patch({ lastName: v })} placeholder="Mayer" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="Desired job title" value={jobTitle} onChange={(v) => patchJob({ desiredJobTitle: v })} placeholder="marketing manager" />
          <CLField label="Email" value={p.email} onChange={(v) => patch({ email: v })} placeholder="john@example.com" type="email" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="Phone" value={p.phone} onChange={(v) => patch({ phone: v })} placeholder="999 888 7777" />
          <CLField label="Address" value={p.address} onChange={(v) => patch({ address: v })} placeholder="500 W 2nd St, Austin, TX 78701" />
        </div>
      </div>
    </div>
  );
}

function ContentSection() {
  const letter = useCoverLetterStore((s) => s.letter);
  const setLetter = useCoverLetterStore((s) => s.setLetter);

  return (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-foreground">Letter content</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Introduce yourself as a candidate and provide more information about your
        professional background.
      </p>
      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="Company name" value={letter.companyName} onChange={(v) => setLetter({ companyName: v })} placeholder="Apple" />
          <CLField label="Hiring manager name" value={letter.hiringManagerName} onChange={(v) => setLetter({ hiringManagerName: v })} placeholder="Sreedhar" />
        </div>
        <div>
          <p className="mb-1.5 text-sm text-muted-foreground">
            Explain why you are a good fit for this job
          </p>
          <RichTextEditor
            value={bodyToHtml(letter.body)}
            onChange={(html) => setLetter({ body: html })}
            minHeight={280}
            placeholder="Write your cover letter…"
          />
        </div>
      </div>
    </div>
  );
}

export function WriteMode({ onSwitchToDesign }: { onSwitchToDesign: () => void }) {
  const [section, setSection] = useState<Section>("personal");

  return (
    <div className="flex gap-6 px-4 pb-16">
      {/* Left nav */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <nav className="space-y-0.5 rounded-2xl bg-card p-2 shadow-card ring-1 ring-border">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                section === n.key
                  ? "bg-muted text-foreground"
                  : "text-foreground/80 hover:bg-muted/60"
              )}
            >
              <span className="text-muted-foreground">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Center editor */}
      <main className="min-w-0 flex-1">
        <div className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-border sm:p-8">
          {section === "personal" ? <PersonalSection /> : <ContentSection />}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
            {section === "content" ? (
              <GhostButton onClick={() => setSection("personal")}>
                <ChevronLeft className="size-4" />
                Back
              </GhostButton>
            ) : (
              <span />
            )}
            <PrimaryButton
              onClick={() =>
                section === "personal" ? setSection("content") : onSwitchToDesign()
              }
            >
              Next
              <ChevronRight className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      </main>

      {/* Right live preview */}
      <section className="hidden min-w-0 flex-1 xl:block">
        <div className="relative rounded-2xl bg-white shadow-card-lg ring-1 ring-border">
          <CoverLetterPreview />
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CircleCheck className="size-3.5" />
            Saved
          </span>
        </div>
      </section>
    </div>
  );
}
