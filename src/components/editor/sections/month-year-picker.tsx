"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Parse "Mar 2024" → sortable number; "Present" → Infinity; invalid → null. */
export function parseMonthYear(s: string): number | null {
  if (s === "Present") return Number.POSITIVE_INFINITY;
  const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1]);
  if (mi < 0) return null;
  return parseInt(m[2], 10) * 12 + mi;
}

/** True when a real end date falls before the start date. */
export function isEndBeforeStart(start: string, end: string): boolean {
  const s = parseMonthYear(start);
  const e = parseMonthYear(end);
  if (s == null || e == null) return false;
  return e < s;
}

/** Compact month + year picker. Optionally offers a "Present" choice. */
export function MonthYearPicker({
  value,
  onChange,
  placeholder,
  allowPresent = false,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowPresent?: boolean;
  /** Earliest selectable month (e.g. the start date). Months before are disabled. */
  min?: string;
}) {
  const minVal = min ? parseMonthYear(min) : null;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // parse "Mar 2024"
  const parsed = /^([A-Za-z]{3})\s+(\d{4})$/.exec(value);
  const selMonth = parsed ? parsed[1] : "";
  const selYear = parsed ? parseInt(parsed[2], 10) : new Date().getFullYear();
  const [year, setYear] = useState(selYear);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (open && parsed) setYear(selYear);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3 text-left text-sm transition-colors hover:border-primary/40",
          !value && "text-muted-foreground"
        )}
      >
        <span>{value || placeholder}</span>
        <Calendar className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-border bg-popover p-3 shadow-card-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="grid size-7 place-items-center rounded-lg hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-bold text-foreground">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="grid size-7 place-items-center rounded-lg hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, mi) => {
              const active = m === selMonth && year === selYear && !!parsed;
              const disabled =
                minVal != null &&
                Number.isFinite(minVal) &&
                year * 12 + mi < minVal;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(`${m} ${year}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-lg py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                    disabled && "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {allowPresent && (
            <button
              type="button"
              onClick={() => {
                onChange("Present");
                setOpen(false);
              }}
              className={cn(
                "mt-2 w-full rounded-lg py-2 text-sm font-semibold transition-colors",
                value === "Present"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/70"
              )}
            >
              Present
            </button>
          )}
        </div>
      )}
    </div>
  );
}
