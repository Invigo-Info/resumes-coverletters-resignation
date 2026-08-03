"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore, type SkillEntry } from "@/features/resume-builder/store/resume-store";
import { generateSkills } from "@/services/ai/mock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableSectionHeading } from "./field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/utilities/utils";

/** A resume reads as thin below this many skills, and full at the upper bound. */
const GOOD_SKILLS = 5;
const FULL_SKILLS = 15;

/**
 * Count + progress ring. Under five skills the ring is amber ("add more"); at
 * five or more it turns green, filling completely by fifteen.
 */
function SkillCount({ count }: { count: number }) {
  const good = count >= GOOD_SKILLS;
  const pct = Math.min(count / FULL_SKILLS, 1);
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const stroke = count === 0 ? "#94A3B8" : good ? "#16A34A" : "#D97706";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${count} ${count === 1 ? "skill" : "skills"} added${
        count === 0 ? "" : good ? ", a good number" : ", add more"
      }`}
    >
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          count === 0
            ? "text-muted-foreground"
            : good
              ? "text-[#15803D]"
              : "text-[#B45309]"
        )}
      >
        {count}
      </span>
      <svg viewBox="0 0 24 24" className="size-5 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="#E2E8F0" strokeWidth="3" />
        {count > 0 && (
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        )}
      </svg>
    </span>
  );
}

/** A labeled row of clickable suggestion chips (e.g. "Hard skills"); hidden when empty. */
function SuggestionGroup({
  label,
  items,
  onAdd,
}: {
  label: string;
  items: string[];
  onAdd: (name: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {items.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onAdd(name)}
            aria-label={`Add ${name}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Plus className="size-4 text-muted-foreground" />
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One chosen skill: an outlined chip, prominent against the soft suggestion
 * chips. The chip itself is a drag source (arrow keys also reorder) and hovering
 * it highlights the matching skill in the live preview - but it NEVER deletes on
 * click. Removal is the dedicated X button, which slides in on hover/focus so the
 * affordance never costs a layout shift.
 */
function SelectedChip({
  skill,
  index,
  dragging,
  over,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
  onRemove,
  onHover,
}: {
  skill: SkillEntry;
  index: number;
  dragging: boolean;
  over: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onMove: (dir: "left" | "right") => void;
  onRemove: () => void;
  onHover: (hovering: boolean) => void;
}) {
  return (
    <div
      draggable
      tabIndex={0}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault(); // required, or the drop never fires
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDrop}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onMove("left");
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onMove("right");
        }
      }}
      aria-label={`${skill.name}. Use the left and right arrow keys to reorder.`}
      className={cn(
        "group relative inline-flex cursor-grab items-center rounded-full border border-primary/70 bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all active:cursor-grabbing",
        "hover:border-primary hover:bg-primary/5",
        "focus-visible:ring-3 focus-visible:ring-ring/40",
        dragging && "opacity-40",
        over && !dragging && "border-primary ring-2 ring-primary/20"
      )}
    >
      {skill.name}
      {/* Remove button: a small circular badge at the top-right corner, shown on
          hover/focus. Absolutely positioned, so revealing it never resizes,
          reflows or jitters the chip. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${skill.name}`}
        className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm outline-none transition-opacity duration-150 hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-destructive/40"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/**
 * Editor section for skills: a renamable title, chosen-skill chips, a custom
 * skill row, and AI hard/soft suggestions driven by the desired job title.
 * Regenerating refreshes suggestions only - it never touches chosen skills.
 */
export function SkillsForm() {
  const skills = useResumeStore((s) => s.skills);
  const addSkill = useResumeStore((s) => s.addSkill);
  const removeSkill = useResumeStore((s) => s.removeSkill);
  const insertSkill = useResumeStore((s) => s.insertSkill);
  const reorderSkills = useResumeStore((s) => s.reorderSkills);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);
  const skillsTitle = useResumeStore((s) => s.skillsTitle);
  const setSkillsTitle = useResumeStore((s) => s.setSkillsTitle);
  const removeSection = useResumeStore((s) => s.removeSection);
  const restoreSection = useResumeStore((s) => s.restoreSection);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const setHoveredSkillId = useResumeStore((s) => s.setHoveredSkillId);

  const [hard, setHard] = useState<string[]>([]);
  const [soft, setSoft] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);
  // The custom-skill row is collapsed behind an "Add your own skill" chip until
  // the user opens it; the row's X collapses it again.
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const selected = skills.filter((sk) => sk.name.trim());
  const chosen = new Set(selected.map((sk) => sk.name.trim().toLowerCase()));
  const count = selected.length;

  // Monotonic token so only the latest request may render (a title change must
  // not let an older in-flight fetch overwrite the newer suggestions).
  const reqRef = useRef(0);

  // Fetch fresh hard/soft suggestions for the current job title, excluding
  // already-chosen skills; seed lets "Regenerate" produce a different set.
  const loadSuggestions = useCallback(
    async (nextSeed: number) => {
      const role = jobTitle.trim();
      const myReq = ++reqRef.current;
      setLoading(true);
      // Clear the previous set up front so a stale/default list never lingers
      // behind the spinner while the new suggestions load.
      setHard([]);
      setSoft([]);
      const exclude = useResumeStore
        .getState()
        .skills.map((s) => s.name)
        .filter(Boolean);
      // With no title the model gets a generic role and a varying seed, so the
      // suggestions are AI-generated and different each time rather than a fixed
      // default set. With a title they are tailored to it.
      const res = await generateSkills({ jobTitle: role, exclude, seed: nextSeed });
      // A newer request superseded this one while it was in flight: discard.
      if (myReq !== reqRef.current) return;
      setHard(res.hard);
      setSoft(res.soft);
      setLoading(false);
    },
    [jobTitle]
  );

  // Suggestions follow the desired job title: set or change it in Personal
  // details and the recommended skill set changes with it. With NO title we
  // start from a random seed so the generic suggestions vary each visit instead
  // of always showing the same set; a title starts from its primary set (0).
  useEffect(() => {
    const initial = jobTitle.trim() ? 0 : 1 + Math.floor(Math.random() * 6);
    setSeed(initial);
    loadSuggestions(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSuggestions]);

  /** Add a skill, ignoring blanks and case-insensitive duplicates. */
  function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const exists = useResumeStore
      .getState()
      .skills.some((sk) => sk.name.trim().toLowerCase() === clean.toLowerCase());
    if (!exists) addSkill(clean);
  }

  const draftClean = draft.trim();
  const draftDuplicate = !!draftClean && chosen.has(draftClean.toLowerCase());

  /** Commit the custom-skill draft. The row stays open for the next skill. */
  function commitOwn() {
    if (!draftClean || draftDuplicate) return;
    add(draftClean);
    setDraft("");
  }

  /** The row's X: discard whatever was typed and collapse back to the chip. */
  function closeCustom() {
    setDraft("");
    setAdding(false);
  }

  /** Delete one skill immediately, with an undo that restores its position. */
  function handleRemove(skill: SkillEntry) {
    const index = useResumeStore.getState().skills.findIndex((s) => s.id === skill.id);
    setHoveredSkillId(null); // the chip is unmounting; don't leave it highlighted
    removeSkill(skill.id);
    toast.success("Successfully deleted", {
      duration: 5000,
      action: { label: "Undo", onClick: () => insertSkill(skill, index) },
    });
  }

  /** Remove the whole section from the resume, with an undo. */
  function handleDeleteSection() {
    setConfirmOpen(false);
    removeSection("skills");
    setActiveSection("personal");
    toast.success("Skills removed", {
      duration: 6000,
      description: "You can add it back from Additional sections.",
      action: {
        label: "Undo",
        onClick: () => {
          restoreSection("skills");
          setActiveSection("skills");
        },
      },
    });
  }

  function commitDrop() {
    if (dragIndex !== null && overIndex !== null) reorderSkills(dragIndex, overIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  function move(index: number, dir: "left" | "right") {
    const to = dir === "left" ? index - 1 : index + 1;
    if (to < 0 || to >= skills.length) return;
    reorderSkills(index, to);
  }

  return (
    <div>
      {/* Header: title (renamable) + count ring + section delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableSectionHeading
            title={skillsTitle}
            fallback="Skills"
            onChange={setSkillsTitle}
            description="List your relevant skills - they impact automated screening the most."
          />
        </div>
        <div className="mt-2 flex shrink-0 items-center gap-3">
          <SkillCount count={count} />
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete the skills section"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Selected skills, plus the collapsed "add your own" affordance. */}
      <div className="flex flex-wrap gap-2.5">
        {selected.map((sk, i) => (
          <SelectedChip
            key={sk.id}
            skill={sk}
            index={i}
            dragging={dragIndex === i}
            over={overIndex === i}
            onDragStart={setDragIndex}
            onDragOver={setOverIndex}
            onDrop={commitDrop}
            onMove={(dir) => move(i, dir)}
            onRemove={() => handleRemove(sk)}
            onHover={(hovering) => setHoveredSkillId(hovering ? sk.id : null)}
          />
        ))}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Plus className="size-4" />
            Add your own skill
          </button>
        )}
      </div>

      {/* Custom skill row: X cancels the row, the inline + confirms the skill. */}
      {adding && (
        <div className="mt-6 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="custom-skill" className="text-sm text-muted-foreground">
              Skill
            </Label>
            <button
              type="button"
              onClick={closeCustom}
              aria-label="Cancel adding a skill"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Input
              id="custom-skill"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitOwn();
                }
                if (e.key === "Escape") closeCustom();
              }}
              aria-invalid={draftDuplicate || undefined}
              aria-describedby={draftDuplicate ? "custom-skill-error" : undefined}
              placeholder="Time Management"
              className="h-14 rounded-xl bg-card pr-14"
            />
            <button
              type="button"
              onClick={commitOwn}
              disabled={!draftClean || draftDuplicate}
              aria-label="Add skill"
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/35 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {draftDuplicate && (
            <p id="custom-skill-error" role="alert" className="text-sm text-destructive">
              {draftClean} is already on your list.
            </p>
          )}
        </div>
      )}

      {/* AI suggestions. Always AI-generated (never a fixed default set): a
          generic-but-varying set with no title, tailored once a title exists.
          A skeleton shows while a set loads so no stale list lingers. */}
      <div className="mt-7 space-y-5">
        {loading && hard.length === 0 && soft.length === 0 ? (
          // Skeleton chips while the set loads (no default flash).
          ["Hard skills", "Soft skills"].map((label) => (
            <div key={label}>
              <p className="mb-2.5 text-sm text-muted-foreground">{label}</p>
              <div className="flex flex-wrap gap-2.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="h-10 animate-pulse rounded-full bg-muted"
                    style={{ width: `${6 + ((i * 3) % 5)}rem` }}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            <SuggestionGroup
              label="Hard skills"
              items={hard.filter((s) => !chosen.has(s.trim().toLowerCase()))}
              onAdd={add}
            />
            <SuggestionGroup
              label="Soft skills"
              items={soft.filter((s) => !chosen.has(s.trim().toLowerCase()))}
              onAdd={add}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            const next = seed + 1;
            setSeed(next);
            loadSuggestions(next);
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color-mix(in_oklab,var(--ai-from),white_92%)] py-4 text-sm font-bold outline-none transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <RefreshCw
            className={cn("size-4 text-[var(--ai-from)]", loading && "animate-spin")}
          />
          <span className="text-gradient-ai">
            {loading ? "Generating…" : "Regenerate"}
          </span>
        </button>
      </div>

      {/* Whole-section delete confirmation. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl p-6 pt-8 sm:max-w-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-destructive/10" aria-hidden>
              <Trash2 className="size-8 text-destructive" />
            </span>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Are you sure you want to delete this section?
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              You can&apos;t undo this action.
            </DialogDescription>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-full bg-muted py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSection}
              className="flex-1 rounded-full bg-destructive py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
