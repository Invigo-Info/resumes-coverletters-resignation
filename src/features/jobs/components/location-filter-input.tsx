"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchLocations } from "@/features/jobs/lib/locations";

/** Lowercase + strip diacritics for match highlighting. */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * Location filter input backed by the local location database (no AI). As the
 * user types it suggests matching states / cities / countries; picking one adds
 * it as a tag via `onAdd` and clears the input, ready for the next location.
 */
export function LocationFilterInput({
  onAdd,
  existing,
}: {
  onAdd: (location: string) => void;
  /** Locations already selected as tags - excluded from the suggestions. */
  existing: string[];
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the panel on any click outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = fold(value.trim());
  const matches = searchLocations(value, existing);

  const add = (loc: string) => {
    const v = loc.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
    setOpen(false);
  };

  // Bold the matched portion of a suggestion.
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

  const showPanel = open && matches.length > 0;

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        placeholder="Enter country or city"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          // Enter selects the top suggestion (custom free-text isn't in the DB).
          if (e.key === "Enter" && matches.length > 0) {
            e.preventDefault();
            add(matches[0]);
          }
        }}
        className="h-12 rounded-xl bg-card"
      />
      {showPanel && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-card-lg">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(m)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <span>{highlight(m)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
