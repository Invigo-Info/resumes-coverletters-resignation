"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, Plus } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { generateSkills } from "@/lib/ai/mock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeading } from "./field";
import { AddMoreButton } from "./entry-card";

const SKILL_LEVELS = [
  "Not applicable",
  "Novice",
  "Beginner",
  "Skillful",
  "Experienced",
  "Expert",
];

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
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((name) => (
          <button
            key={name}
            onClick={() => onAdd(name)}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SkillsForm() {
  const skills = useResumeStore((s) => s.skills);
  const addSkill = useResumeStore((s) => s.addSkill);
  const updateSkill = useResumeStore((s) => s.updateSkill);
  const removeSkill = useResumeStore((s) => s.removeSkill);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);

  const [hard, setHard] = useState<string[]>([]);
  const [soft, setSoft] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);

  const chosen = new Set(skills.map((s) => s.name).filter(Boolean));
  const count = chosen.size;

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

  useEffect(() => {
    if (useResumeStore.getState().skills.length === 0) addSkill();
    loadSuggestions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(name: string) {
    // fill the first empty skill row, otherwise append
    const empty = skills.find((s) => !s.name.trim());
    if (empty) updateSkill(empty.id, { name });
    else addSkill(name);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Skills
          </h1>
          <p className="mt-2 text-muted-foreground">
            List your relevant skills — they impact automated screening the most.
          </p>
        </div>
        <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-foreground">
          {count}
        </span>
      </div>

      {/* Selected skills */}
      <div className="space-y-4">
        {skills.map((sk) => (
          <div key={sk.id} className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Skill</Label>
                <Input
                  value={sk.name}
                  onChange={(e) => updateSkill(sk.id, { name: e.target.value })}
                  placeholder="Data Analysis"
                  className="h-12 rounded-xl bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Level</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={sk.level ?? ""}
                    onValueChange={(v) => updateSkill(sk.id, { level: (v as string) ?? "" })}
                  >
                    <SelectTrigger className="h-12 w-full rounded-xl bg-card">
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => removeSkill(sk.id)}
                    aria-label="Remove skill"
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <AddMoreButton label="Add one more skill" onClick={() => addSkill()} />
      </div>

      {/* Suggestions */}
      <div className="mt-8 space-y-5">
        <SuggestionGroup
          label="Hard skills"
          items={hard.filter((s) => !chosen.has(s))}
          onAdd={add}
        />
        <SuggestionGroup
          label="Soft skills"
          items={soft.filter((s) => !chosen.has(s))}
          onAdd={add}
        />
        <button
          onClick={() => {
            const next = seed + 1;
            setSeed(next);
            loadSuggestions(next);
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
