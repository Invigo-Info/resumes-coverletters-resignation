"use client";

import { useState } from "react";
import {
  UserRound,
  Briefcase,
  Mail,
  CircleCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useResignationLetterStore } from "@/lib/store/resignation-letter-store";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { bodyToHtml, htmlToText } from "@/lib/resignation-letter/format";
import { improveLetterBody } from "@/lib/resignation-letter/ai";
import { ResignationLetterPreview } from "./resignation-letter-preview";
import { RLField, IMPROVE_AI_ACTIONS } from "./widgets";
import { cn } from "@/lib/utils";

type Section = "personal" | "employer" | "content";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "personal", label: "Personal details", icon: <UserRound className="size-4" /> },
  { key: "employer", label: "Employer's info", icon: <Briefcase className="size-4" /> },
  { key: "content", label: "Letter content", icon: <Mail className="size-4" /> },
];

function PersonalSection() {
  const fullName = useResignationLetterStore((s) => s.fullName);
  const setFullName = useResignationLetterStore((s) => s.setFullName);
  const contacts = useResignationLetterStore((s) => s.contacts);
  const patch = useResignationLetterStore((s) => s.patchContacts);
  return (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-foreground">Personal details</h2>
      <p className="mt-2 text-sm text-muted-foreground">Your name and contact details for the letter.</p>
      <div className="mt-6 space-y-5">
        <RLField label="Full name" value={fullName} onChange={setFullName} placeholder="John Mayer" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RLField label="Email" value={contacts.email} onChange={(v) => patch({ email: v })} placeholder="john@example.com" type="email" />
          <RLField label="Phone" value={contacts.phone} onChange={(v) => patch({ phone: v })} placeholder="999 888 7777" />
        </div>
        <RLField label="Address" value={contacts.address} onChange={(v) => patch({ address: v })} placeholder="500 W 2nd St, Austin, TX 78701" />
      </div>
    </div>
  );
}

function EmployerSection() {
  const employer = useResignationLetterStore((s) => s.employer);
  const patch = useResignationLetterStore((s) => s.patchEmployer);
  const position = useResignationLetterStore((s) => s.position);
  const setPosition = useResignationLetterStore((s) => s.setPosition);
  return (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-foreground">Employer&apos;s info</h2>
      <p className="mt-2 text-sm text-muted-foreground">Who the letter is addressed to and the role you&apos;re leaving.</p>
      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RLField label="Manager's name" value={employer.managerName} onChange={(v) => patch({ managerName: v })} placeholder="David Williams" />
          <RLField label="Company name" value={employer.companyName} onChange={(v) => patch({ companyName: v })} placeholder="Apple Inc." />
        </div>
        <RLField label="Company address (optional)" value={employer.companyAddress} onChange={(v) => patch({ companyAddress: v })} placeholder="500 W 2nd St, Austin, TX 78701" />
        <RLField label="Position you are leaving" value={position} onChange={setPosition} placeholder="Account Manager" />
      </div>
    </div>
  );
}

function ImproveWithAI() {
  const letter = useResignationLetterStore((s) => s.letter);
  const setLetter = useResignationLetterStore((s) => s.setLetter);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(instruction: string) {
    setOpen(false);
    setBusy(true);
    try {
      const improved = await improveLetterBody(htmlToText(letter.body), instruction);
      if (improved) setLetter({ body: bodyToHtml(improved) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/10 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Improve with AI
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-xl bg-card p-1.5 shadow-card-lg ring-1 ring-border">
          {IMPROVE_AI_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => run(a.instruction)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="size-4 text-[#7C3AED]" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentSection() {
  const letter = useResignationLetterStore((s) => s.letter);
  const setLetter = useResignationLetterStore((s) => s.setLetter);
  return (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-foreground">Letter content</h2>
      <p className="mt-2 text-sm text-muted-foreground">Write the content of the letter.</p>
      <div className="mt-6">
        <p className="mb-1.5 text-sm text-muted-foreground">Letter body</p>
        <RichTextEditor
          value={bodyToHtml(letter.body)}
          onChange={(html) => setLetter({ body: html })}
          minHeight={260}
          placeholder="Write your resignation letter…"
          toolbarRight={<ImproveWithAI />}
        />
      </div>
    </div>
  );
}

export function WriteMode({ onSwitchToDesign }: { onSwitchToDesign: () => void }) {
  const [section, setSection] = useState<Section>("personal");
  const order: Section[] = ["personal", "employer", "content"];
  const idx = order.indexOf(section);

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
                section === n.key ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted/60"
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
          {section === "personal" && <PersonalSection />}
          {section === "employer" && <EmployerSection />}
          {section === "content" && <ContentSection />}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
            {idx > 0 ? (
              <GhostButton onClick={() => setSection(order[idx - 1])}>
                <ChevronLeft className="size-4" />
                Back
              </GhostButton>
            ) : (
              <span />
            )}
            <PrimaryButton
              onClick={() => (idx < order.length - 1 ? setSection(order[idx + 1]) : onSwitchToDesign())}
            >
              Next
              <ChevronRight className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      </main>

      {/* Right live preview */}
      <section className="hidden min-w-0 flex-1 xl:block">
        <div className="relative">
          <ResignationLetterPreview variant="page" />
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CircleCheck className="size-3.5" />
            Saved
          </span>
        </div>
      </section>
    </div>
  );
}
