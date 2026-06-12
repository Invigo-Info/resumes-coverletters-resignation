"use client";

import {
  UserRound,
  Briefcase,
  Mail,
  FileText,
  Lightbulb,
  GraduationCap,
  Plus,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import {
  useResumeStore,
  getImproveSuggestions,
  type SectionKey,
} from "@/lib/store/resume-store";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEM_ICON: Record<string, LucideIcon> = {
  firstName: UserRound,
  lastName: UserRound,
  jobTitle: Briefcase,
  email: Mail,
  summary: FileText,
  employment: Briefcase,
  skills: Lightbulb,
  education: GraduationCap,
};

export function ImprovePanel({
  onNavigate,
  onBack,
}: {
  onNavigate: (section: SectionKey) => void;
  onBack: () => void;
}) {
  const s = useResumeStore();
  const todo = getImproveSuggestions(s);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Add more details
        </h1>
        <p className="mt-2 text-muted-foreground">
          Including these increases your chances of getting an interview.
        </p>
      </div>

      {todo.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 px-6 py-12 text-center">
          <PartyPopper className="size-8 text-emerald-600" />
          <p className="text-lg font-bold text-foreground">
            Your resume is looking great!
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            You&apos;ve added all the recommended details. Head to Design to
            finish up and download.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todo.map((item) => {
            const Icon = ITEM_ICON[item.key] ?? Plus;
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
              >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex-1 font-medium text-foreground">
                  {item.label}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  +{item.weight}%
                </span>
                <button
                  onClick={() => onNavigate(item.target)}
                  aria-label={`Add ${item.label}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
        <GhostButton onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </GhostButton>
        {todo.length > 0 && (
          <PrimaryButton onClick={() => onNavigate(todo[0].target)}>
            Add now
            <ChevronRight className="size-4" />
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
