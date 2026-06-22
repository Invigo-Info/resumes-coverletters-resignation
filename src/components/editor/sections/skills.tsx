"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus, Pencil, Check, Trash2, X } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { generateSkills } from "@/lib/ai/mock";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
            onClick={() => onAdd(name)}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground"
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
 * Editor section for skills: a renamable title, chosen-skill chips, free-form
 * entry, and AI-generated hard/soft suggestions that can be regenerated.
 */
export function SkillsForm() {
  const skills = useResumeStore((s) => s.skills);
  const addSkill = useResumeStore((s) => s.addSkill);
  const removeSkill = useResumeStore((s) => s.removeSkill);
  const clearSkills = useResumeStore((s) => s.clearSkills);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);
  const skillsTitle = useResumeStore((s) => s.skillsTitle);
  const setSkillsTitle = useResumeStore((s) => s.setSkillsTitle);

  const [hard, setHard] = useState<string[]>([]);
  const [soft, setSoft] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const selected = skills.filter((sk) => sk.name.trim());
  const chosen = new Set(selected.map((sk) => sk.name.trim().toLowerCase()));
  const count = selected.length;

  // Fetch fresh hard/soft suggestions for the current job title, excluding
  // already-chosen skills; seed lets "Regenerate" produce a different set.
  const loadSuggestions = useCallback(
    async (nextSeed: number) => {
      setLoading(true);
      const exclude = useResumeStore
        .getState()
        .skills.map((s) => s.name)
        .filter(Boolean);
      const res = await generateSkills({ jobTitle, exclude, seed: nextSeed });
      setHard(res.hard);
      setSoft(res.soft);
      setLoading(false);
    },
    [jobTitle]
  );

  // Load an initial suggestion set once on mount.
  useEffect(() => {
    loadSuggestions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Add a skill, ignoring blanks and case-insensitive duplicates. */
  function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const exists = useResumeStore
      .getState()
      .skills.some((sk) => sk.name.trim().toLowerCase() === clean.toLowerCase());
    if (!exists) addSkill(clean);
  }

  // Commit the free-text "add your own" draft and reset the input.
  function commitOwn() {
    add(draft);
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      {/* Header: title (renamable) + count + clear-all */}
      <div className="mb-1.5 flex items-center gap-2">
        {editingTitle ? (
          <Input
            autoFocus
            value={skillsTitle}
            onChange={(e) => setSkillsTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
            className="h-10 max-w-xs rounded-lg text-2xl font-extrabold"
          />
        ) : (
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {skillsTitle?.trim() || "Skills"}
          </h1>
        )}
        <button
          onClick={() => setEditingTitle((v) => !v)}
          aria-label="Rename section"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {editingTitle ? <Check className="size-4" /> : <Pencil className="size-4" />}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5" aria-label={`${count} skills`}>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                count ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {count}
            </span>
            <span
              className={cn(
                "size-3.5 rounded-full border-2",
                count ? "border-emerald-500" : "border-muted-foreground/40"
              )}
              aria-hidden
            />
          </span>
          <button
            onClick={clearSkills}
            disabled={!count}
            aria-label="Clear all skills"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <p className="mb-6 text-muted-foreground">
        List your relevant skills — they impact automated screening the most.
      </p>

      {/* Selected skills (blue chips) + add your own */}
      <div className="flex flex-wrap gap-2.5">
        {selected.map((sk) => (
          <button
            key={sk.id}
            onClick={() => removeSkill(sk.id)}
            title="Remove skill"
            className="group inline-flex items-center gap-1.5 rounded-full border border-primary/70 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/5"
          >
            {sk.name}
            <X className="size-3.5 text-muted-foreground transition-colors group-hover:text-destructive" />
          </button>
        ))}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitOwn}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitOwn();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Type a skill"
            className="min-w-44 rounded-full border border-dashed border-primary/60 bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <Plus className="size-4" />
            Add your own skill
          </button>
        )}
      </div>

      {/* AI suggestions */}
      <div className="mt-7 space-y-5">
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
        <button
          onClick={() => {
            const next = seed + 1;
            setSeed(next);
            loadSuggestions(next);
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color-mix(in_oklab,var(--ai-from),white_92%)] py-4 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw
            className={cn("size-4 text-[var(--ai-from)]", loading && "animate-spin")}
          />
          <span className="text-gradient-ai">
            {loading ? "Generating…" : "Regenerate"}
          </span>
        </button>
      </div>
    </div>
  );
}
