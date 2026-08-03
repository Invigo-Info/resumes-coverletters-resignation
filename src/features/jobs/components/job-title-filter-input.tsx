"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/forms/input";
import { suggestOptions } from "@/services/ai/mock";

/** Lowercase + strip diacritics for matching (mirrors AutocompleteInput). */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

type Match = { text: string; ai: boolean };

/**
 * Job-title filter input with a suggestion dropdown. As the user types it merges
 * static role-related titles with live AI completions, and always offers a final
 * "add the typed text" row (bold text + a plus icon) so a custom job title that
 * isn't in the suggestions can still be added as a tag. Picking any row adds the
 * title and clears the input, ready for the next one.
 */
export function JobTitleFilterInput({
  onAdd,
  staticSuggestions,
  existing,
}: {
  onAdd: (title: string) => void;
  staticSuggestions: string[];
  /** Titles already selected as tags - excluded from the suggestions. */
  existing: string[];
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Close the panel on any click outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = fold(value.trim());

  // Debounced AI completion fetch for job titles.
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setAiMatches([]);
      setLoadingAi(false);
      return;
    }
    const id = ++reqId.current;
    setLoadingAi(true);
    const t = setTimeout(async () => {
      const res = await suggestOptions({ kind: "jobTitle", query });
      if (id === reqId.current) {
        setAiMatches(res);
        setLoadingAi(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  // Merge static + AI matches, dedup, drop already-selected titles.
  const existingSet = new Set(existing.map((x) => fold(x)));
  const matches: Match[] = [];
  const seen = new Set<string>();
  const push = (text: string, ai: boolean) => {
    const key = fold(text.trim());
    if (!key || seen.has(key) || existingSet.has(key)) return;
    seen.add(key);
    matches.push({ text, ai });
  };
  if (q.length > 0) {
    staticSuggestions
      .filter((o) => fold(o).includes(q))
      .sort((a, b) => Number(fold(b).startsWith(q)) - Number(fold(a).startsWith(q)))
      .forEach((o) => push(o, false));
  }
  aiMatches.forEach((o) => push(o, true));
  const shown = matches.slice(0, 6);

  const trimmed = value.trim();
  // Offer the custom "add" row whenever there's text that isn't already an exact
  // suggestion or an existing tag.
  const exact = shown.some((m) => fold(m.text) === q) || existingSet.has(q);
  const showAddRow = trimmed.length > 0 && !exact;

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
    setAiMatches([]);
    setOpen(false);
  };

  // Bold the matched portion of a suggestion (index stays aligned after folding).
  function highlight(text: string) {
    const i = fold(text).indexOf(q);
    if (i === -1 || q.length === 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <span className="font-semibold text-foreground">{text.slice(i, i + q.length)}</span>
        {text.slice(i + q.length)}
      </>
    );
  }

  const showPanel = open && (shown.length > 0 || showAddRow || loadingAi);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        placeholder="Enter title"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(value);
          }
        }}
        className="h-12 rounded-xl bg-card"
      />
      {showPanel && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-card-lg">
          {shown.map((m) => (
            <li key={m.text}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(m.text)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <span>{highlight(m.text)}</span>
                {m.ai && <Sparkles className="size-3.5 shrink-0 text-[var(--ai-from)]" />}
              </button>
            </li>
          ))}

          {/* Add-the-typed-text row (custom job title). */}
          {showAddRow && (
            <li className={shown.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(trimmed)}
                aria-label={`Add ${trimmed}`}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <span>{trimmed}</span>
                <Plus className="size-4 shrink-0 text-foreground" />
              </button>
            </li>
          )}

          {loadingAi && (
            <li className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse text-[var(--ai-from)]" />
              Finding suggestions
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
