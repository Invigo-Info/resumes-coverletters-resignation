"use client";

import { useEffect, useState } from "react";
import { GraduationCap, School, BookOpen, SquareX, Sparkles } from "lucide-react";
import { useCoverLetterStore, isValidEmail, type EducationLevel } from "@/lib/store/cover-letter-store";
import {
  CL_SKILLS,
  CL_STRENGTHS,
  CL_ROLES,
  CL_UNIVERSITIES,
  CL_FIELDS,
  CL_EXPERIENCE,
  experienceLabel,
} from "@/lib/cover-letter/suggestions";
import { rankChips } from "@/lib/cover-letter/ai";
import { cn } from "@/lib/utils";

/**
 * Reorder a static chip pool so the picks most relevant to the user's desired
 * job title come first (live Gemini ranking, original order on fallback).
 * Returns whether the AI reorder has landed so the UI can show a hint.
 */
function useRankedChips(pool: string[], kind: "skills" | "strengths" | "roles") {
  const role = useCoverLetterStore((s) => s.jobDetails.desiredJobTitle);
  const [ordered, setOrdered] = useState(pool);
  const [ranked, setRanked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!role.trim()) {
      setOrdered(pool);
      setRanked(false);
      return;
    }
    rankChips(role, kind, pool).then((next) => {
      if (!active) return;
      setOrdered(next);
      setRanked(next.some((v, i) => v !== pool[i]));
    });
    return () => {
      active = false;
    };
    // pool is a module-level constant; role/kind drive the ranking.
  }, [role, kind, pool]);

  return { ordered, ranked, role };
}

/** Small "AI-ranked for <role>" hint shown above ranked chip grids. */
function RankHint({ ranked, role }: { ranked: boolean; role: string }) {
  if (!ranked) return null;
  return (
    <p className="mb-5 flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
      <Sparkles className="size-3.5" />
      Sorted by relevance to {role}
    </p>
  );
}
import {
  StepHeading,
  ChipMultiSelect,
  ChipSingleSelectInput,
  CLField,
  OptionRadioCard,
} from "./widgets";

/* --- Job details (YES) — step 3/26 --------------------------------- */
/** Step for users targeting a specific job: title, company, manager, and pasted JD. */
export function JobDetailsStep() {
  const jd = useCoverLetterStore((s) => s.jobDetails);
  const patch = useCoverLetterStore((s) => s.patchJobDetails);
  return (
    <div>
      <StepHeading
        title="Please provide details of your desired job"
        subtitle="Copy and paste a job description from anywhere"
      />
      <div className="space-y-5">
        <CLField
          label="Desired job title"
          value={jd.desiredJobTitle}
          onChange={(v) => patch({ desiredJobTitle: v })}
          placeholder="Account Manager"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField
            label="Company name (optional)"
            value={jd.companyName}
            onChange={(v) => patch({ companyName: v })}
            placeholder="Apple Inc."
          />
          <CLField
            label="Hiring manager name (optional)"
            value={jd.hiringManagerName}
            onChange={(v) => patch({ hiringManagerName: v })}
            placeholder="David Williams"
          />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Enter the description of the position
          </span>
          <textarea
            value={jd.jobDescription}
            onChange={(e) => patch({ jobDescription: e.target.value })}
            rows={6}
            placeholder="Paste the job description here…"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>
      </div>
    </div>
  );
}

/* --- Desired job title (NO) — step 12/27 --------------------------- */
/** Step for users without a specific job: pick/type the desired role from suggestions. */
export function DesiredTitleStep() {
  const value = useCoverLetterStore((s) => s.jobDetails.desiredJobTitle);
  const patch = useCoverLetterStore((s) => s.patchJobDetails);
  return (
    <div>
      <StepHeading title="Desired job title" />
      <ChipSingleSelectInput
        value={value}
        onChange={(v) => patch({ desiredJobTitle: v })}
        options={CL_ROLES}
        placeholder="marketing manager"
      />
    </div>
  );
}

/* --- Skills — step 4/13 -------------------------------------------- */
/** Pick up to 3 skills; chips are AI-ranked by relevance to the desired role. */
export function SkillsStep() {
  const skills = useCoverLetterStore((s) => s.skills);
  const toggle = useCoverLetterStore((s) => s.toggleSkill);
  const { ordered, ranked, role } = useRankedChips(CL_SKILLS, "skills");
  return (
    <div>
      <StepHeading title="Pick top 3 of your professional skills" />
      <RankHint ranked={ranked} role={role} />
      <ChipMultiSelect options={ordered} selected={skills} onToggle={toggle} max={3} hot={3} />
    </div>
  );
}

/* --- Experience — step 5 ------------------------------------------- */
/** Pick years-of-experience bucket; shows a friendly label for the selection. */
export function ExperienceStep() {
  const value = useCoverLetterStore((s) => s.experience);
  const setExperience = useCoverLetterStore((s) => s.setExperience);
  return (
    <div>
      <StepHeading title="Adapt your experience to match the role" />
      <div className="flex flex-wrap justify-center gap-2">
        {CL_EXPERIENCE.map((opt) => {
          const isSel = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setExperience(opt)}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-xl text-sm font-semibold transition-all",
                isSel
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-foreground hover:bg-muted/70"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-4 rounded-xl bg-muted py-3 text-center text-sm font-semibold text-foreground">
          {experienceLabel(value)}
        </div>
      )}
    </div>
  );
}

/* --- Recent job — step 6 ------------------------------------------- */
/** Capture the user's most recent job title and (optional) company. */
export function RecentJobStep() {
  const rj = useCoverLetterStore((s) => s.recentJob);
  const patch = useCoverLetterStore((s) => s.patchRecentJob);
  return (
    <div>
      <StepHeading title="Tell us about your recent job" />
      <div className="space-y-5">
        <CLField
          label="Job title"
          value={rj.jobTitle}
          onChange={(v) => patch({ jobTitle: v })}
          placeholder="Account Manager"
        />
        <CLField
          label="Company (optional)"
          value={rj.company}
          onChange={(v) => patch({ company: v })}
          placeholder="Apple Inc."
        />
      </div>
    </div>
  );
}

/* --- Education level — step 7/19 ----------------------------------- */
// Selectable education levels; the chosen level drives whether degree/field steps appear.
const EDUCATION_OPTIONS: { level: EducationLevel; label: string; icon: React.ReactNode }[] = [
  { level: "college", label: "College graduate or higher", icon: <GraduationCap className="size-4" /> },
  { level: "highschool", label: "High school graduate", icon: <School className="size-4" /> },
  { level: "student", label: "Student", icon: <BookOpen className="size-4" /> },
  { level: "none", label: "Prefer not to mention", icon: <SquareX className="size-4" /> },
];

/** Choose highest education level; selection conditionally branches the wizard. */
export function EducationStep() {
  const level = useCoverLetterStore((s) => s.education.level);
  const setLevel = useCoverLetterStore((s) => s.setEducationLevel);
  return (
    <div>
      <StepHeading title="Choose your highest education level" />
      <div className="space-y-3">
        {EDUCATION_OPTIONS.map((o) => (
          <OptionRadioCard
            key={o.level}
            icon={o.icon}
            label={o.label}
            selected={level === o.level}
            onClick={() => setLevel(o.level)}
          />
        ))}
      </div>
    </div>
  );
}

/* --- Degree (graduate) — step 8 ------------------------------------ */
/** Graduate-only step: where the degree was earned (university suggestions). */
export function DegreeStep() {
  const value = useCoverLetterStore((s) => s.education.university);
  const patch = useCoverLetterStore((s) => s.patchEducation);
  return (
    <div>
      <StepHeading title="Where did you earn your degree?" />
      <ChipSingleSelectInput
        value={value}
        onChange={(v) => patch({ university: v })}
        options={CL_UNIVERSITIES}
        placeholder="Harvard University"
      />
    </div>
  );
}

/* --- Field of study (graduate) — step 9 ---------------------------- */
/** Graduate-only step: the user's field of study (field suggestions). */
export function FieldStep() {
  const value = useCoverLetterStore((s) => s.education.field);
  const patch = useCoverLetterStore((s) => s.patchEducation);
  return (
    <div>
      <StepHeading title="Your field of study" />
      <ChipSingleSelectInput
        value={value}
        onChange={(v) => patch({ field: v })}
        options={CL_FIELDS}
        placeholder="Computer engineering"
      />
    </div>
  );
}

/* --- Strengths — step 10 ------------------------------------------- */
/** Pick up to 3 personal strengths; chips are AI-ranked by relevance to the role. */
export function StrengthsStep() {
  const strengths = useCoverLetterStore((s) => s.strengths);
  const toggle = useCoverLetterStore((s) => s.toggleStrength);
  const { ordered, ranked, role } = useRankedChips(CL_STRENGTHS, "strengths");
  return (
    <div>
      <StepHeading title="Choose 3 strengths that resonate with you" />
      <RankHint ranked={ranked} role={role} />
      <ChipMultiSelect options={ordered} selected={strengths} onToggle={toggle} max={3} />
    </div>
  );
}

/* --- Personal details — step 11 ------------------------------------ */
/** Final input step: name, email (validated), phone, and address for the letter header. */
export function PersonalStep() {
  const p = useCoverLetterStore((s) => s.personal);
  const patch = useCoverLetterStore((s) => s.patchPersonal);
  const emailError =
    p.email.trim().length > 0 && !isValidEmail(p.email) ? "Enter a valid email address" : undefined;
  return (
    <div>
      <StepHeading title="Lastly, provide your personal details" />
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="First name" value={p.firstName} onChange={(v) => patch({ firstName: v })} placeholder="John" />
          <CLField label="Last name" value={p.lastName} onChange={(v) => patch({ lastName: v })} placeholder="Smith" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CLField label="Email" value={p.email} onChange={(v) => patch({ email: v })} placeholder="john@example.com" type="email" error={emailError} />
          <CLField label="Phone" value={p.phone} onChange={(v) => patch({ phone: v })} placeholder="999 888 7777" />
        </div>
        <CLField label="Address" value={p.address} onChange={(v) => patch({ address: v })} placeholder="500 W 2nd St, Austin, TX 78701" />
      </div>
    </div>
  );
}
