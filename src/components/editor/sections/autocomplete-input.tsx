"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { suggestOptions } from "@/lib/ai/mock";

type Match = { text: string; ai: boolean };

/**
 * Text input with a suggestion dropdown. Always filters the static `options`
 * list instantly; when `aiKind` is set it also fetches live AI completions
 * (debounced) and merges them in, so suggestions adapt to whatever the user
 * types instead of being limited to the static list.
 */
export function AutocompleteInput({
  value,
  onChange,
  placeholder,
  options,
  aiKind,
  max = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];
  /** When set, also fetch AI completions for this field kind (e.g. "jobTitle"). */
  aiKind?: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = value.trim().toLowerCase();

  // Debounced AI completion fetch.
  useEffect(() => {
    if (!aiKind) return;
    const query = value.trim();
    if (query.length < 2) {
      setAiMatches([]);
      setLoadingAi(false);
      return;
    }
    const id = ++reqId.current;
    setLoadingAi(true);
    const t = setTimeout(async () => {
      const res = await suggestOptions({ kind: aiKind, query });
      if (id === reqId.current) {
        setAiMatches(res);
        setLoadingAi(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value, aiKind]);

  const effectiveMax = aiKind ? Math.max(max, 8) : max;

  // Merge static + AI matches, dedup (static wins), drop the exact current value.
  const matches: Match[] = [];
  const seen = new Set<string>();
  const push = (text: string, ai: boolean) => {
    const key = text.trim().toLowerCase();
    if (!key || key === q || seen.has(key)) return;
    seen.add(key);
    matches.push({ text, ai });
  };
  if (q.length > 0) {
    options
      .filter((o) => o.toLowerCase().includes(q))
      .forEach((o) => push(o, false));
  }
  aiMatches.forEach((o) => push(o, true));
  const shown = matches.slice(0, effectiveMax);

  function highlight(text: string) {
    const i = text.toLowerCase().indexOf(q);
    if (i === -1 || q.length === 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <span className="font-semibold text-foreground">
          {text.slice(i, i + q.length)}
        </span>
        {text.slice(i + q.length)}
      </>
    );
  }

  const showPanel = open && (shown.length > 0 || loadingAi);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-12 rounded-xl bg-card"
      />
      {showPanel && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-card-lg">
          {shown.map((m) => (
            <li key={m.text}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m.text);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <span>{highlight(m.text)}</span>
                {m.ai && (
                  <Sparkles className="size-3.5 shrink-0 text-[var(--ai-from)]" />
                )}
              </button>
            </li>
          ))}
          {loadingAi && (
            <li className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse text-[var(--ai-from)]" />
              Finding suggestions…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
