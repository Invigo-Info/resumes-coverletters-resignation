"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatLetterDate } from "@/lib/resignation-letter/format";
import { cn } from "@/lib/utils";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** "2026-06-30" -> {y, m (0-based), d}, or null. */
function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** y, m (0-based), d -> "yyyy-mm-dd". */
function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Midnight Date for a y/m/d (local, no TZ drift). */
function atMidnight(y: number, m: number, d: number): Date {
  const dt = new Date(y, m, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/**
 * Calendar date picker emitting ISO `yyyy-mm-dd`. Replaces the native date input
 * with a styled popover: month/year header, stepper arrows, faded adjacent-month
 * days, today outline, selected highlight, and Clear / Today actions. `min`
 * disables earlier days (e.g. last working day can't precede the submission date).
 */
export function RLDatePicker({
  value,
  onChange,
  min,
  error,
  placeholder = "Select a date",
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sel = parseISO(value);
  const today = new Date();
  const [viewY, setViewY] = useState(sel?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(sel?.m ?? today.getMonth());

  // When opening, jump the calendar to the selected month (or today).
  useEffect(() => {
    if (!open) {
      setPicking(false);
      return;
    }
    const s = parseISO(value);
    setViewY(s?.y ?? new Date().getFullYear());
    setViewM(s?.m ?? new Date().getMonth());
  }, [open, value]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const minDate = min ? parseISO(min) : null;
  const minTime = minDate ? atMidnight(minDate.y, minDate.m, minDate.d).getTime() : null;
  const todayTime = atMidnight(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  function prevMonth() {
    setViewM((m) => (m === 0 ? 11 : m - 1));
    if (viewM === 0) setViewY((y) => y - 1);
  }
  function nextMonth() {
    setViewM((m) => (m === 11 ? 0 : m + 1));
    if (viewM === 11) setViewY((y) => y + 1);
  }

  function pick(y: number, m: number, d: number) {
    onChange(toISO(y, m, d));
    setOpen(false);
  }

  // Full 6-week (42-cell) grid, including faded leading/trailing days.
  const firstDow = new Date(viewY, viewM, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(viewY, viewM, 1 - firstDow + i);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-invalid={!!error}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border bg-card px-4 text-left text-sm transition-colors",
          error
            ? "border-red-400 focus:border-red-500"
            : "border-input hover:border-primary/40 focus:border-primary",
          !value && "text-muted-foreground"
        )}
      >
        <span>{value ? formatLetterDate(value) : placeholder}</span>
        <Calendar className="size-4 text-muted-foreground" />
      </button>

      {error && <span className="mt-1.5 block text-xs font-medium text-red-500">{error}</span>}

      {open && (
        <div className="absolute z-30 mt-2 w-[19rem] rounded-2xl border border-border bg-popover p-3 shadow-card-lg">
          {/* Header: month/year (toggles quick-pick) + month steppers */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {MONTHS_FULL[viewM]} {viewY}
              <ChevronDown className={cn("size-4 transition-transform", picking && "rotate-180")} />
            </button>
            {!picking && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={prevMonth}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={nextMonth}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            )}
          </div>

          {picking ? (
            /* Quick month + year picker */
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  aria-label="Previous year"
                  onClick={() => setViewY((y) => y - 1)}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-semibold text-foreground">{viewY}</span>
                <button
                  type="button"
                  aria-label="Next year"
                  onClick={() => setViewY((y) => y + 1)}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewM(i);
                      setPicking(false);
                    }}
                    className={cn(
                      "rounded-lg py-2 text-sm font-medium transition-colors",
                      i === viewM
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
                {DOW.map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((date, i) => {
                  const inMonth = date.getMonth() === viewM;
                  const t = date.getTime();
                  const isToday = t === todayTime;
                  const isSelected =
                    !!sel &&
                    date.getFullYear() === sel.y &&
                    date.getMonth() === sel.m &&
                    date.getDate() === sel.d;
                  const disabled = minTime !== null && t < minTime;
                  return (
                    <div key={i} className="flex justify-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(date.getFullYear(), date.getMonth(), date.getDate())}
                        className={cn(
                          "grid size-9 place-items-center rounded-lg text-sm transition-colors",
                          isSelected
                            ? "bg-primary font-semibold text-primary-foreground"
                            : isToday
                              ? "text-foreground ring-1 ring-inset ring-border hover:bg-muted"
                              : inMonth
                                ? "text-foreground hover:bg-muted"
                                : "text-muted-foreground/50 hover:bg-muted",
                          disabled && "cursor-not-allowed text-muted-foreground/30 hover:bg-transparent"
                        )}
                      >
                        {date.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer: Clear / Today */}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const tIso = toISO(today.getFullYear(), today.getMonth(), today.getDate());
                if (minTime === null || todayTime >= minTime) pick(today.getFullYear(), today.getMonth(), today.getDate());
                else onChange(tIso);
              }}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-muted"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
