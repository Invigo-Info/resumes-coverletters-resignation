"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const NOW_YEAR = new Date().getFullYear();
// Selectable years: the last 90, newest first.
const YEARS = Array.from({ length: 90 }, (_, i) => NOW_YEAR - i);

/** Calendar date picker. Emits "DD MMM YYYY" (e.g. "03 Feb 1996"). */
export function BirthDatePicker({
  value,
  onChange,
  placeholder = "03 Feb 1996",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(value);
  const initMonth = parsed ? MONTHS.indexOf(parsed[2]) : 0;
  const initYear = parsed ? parseInt(parsed[3], 10) : 1996;
  const selDay = parsed ? parseInt(parsed[1], 10) : 0;

  const [month, setMonth] = useState(initMonth < 0 ? 0 : initMonth);
  const [year, setYear] = useState(initYear);

  // Close the calendar popover on any click outside it.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Build the month grid: pad leading blanks for the weekday the 1st falls on,
  // then one cell per day of the month.
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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
        <div className="absolute z-30 mt-1 w-72 rounded-xl border border-border bg-popover p-3 shadow-card-lg">
          <div className="mb-3 flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
            {DOW.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const active =
                !!parsed && d === selDay && month === initMonth && year === initYear;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const dd = String(d).padStart(2, "0");
                    onChange(`${dd} ${MONTHS[month]} ${year}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "grid size-8 place-items-center rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
