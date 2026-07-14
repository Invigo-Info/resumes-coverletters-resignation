"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Heart } from "lucide-react";
import { PrimaryButton } from "@/components/brand/brand-buttons";
import { useCoverLetterDocumentsStore } from "@/lib/store/cover-letter-documents-store";

/** The daily cover-letter goal the progress ring fills toward. */
const DAILY_GOAL = 5;

// Strip HTML tags to test whether a letter body has real text.
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** True when the timestamp falls on the local calendar day of "now". */
function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/** Circular progress ring (green) with a heart-letter tile at its center. */
function ProgressRing({ value, goal }: { value: number; goal: number }) {
  const size = 92;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(value, goal) / goal : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference}`}
          className="stroke-emerald-500 transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-11 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <Heart className="size-5 fill-rose-500 text-rose-500" />
        </span>
      </span>
    </div>
  );
}

/** A single blue stat card (job applications / days to offer). */
function StatCard({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
      <p className="font-heading text-3xl font-extrabold text-primary">{value}</p>
      <p className="mt-1 text-sm font-bold text-primary-strong">{label}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Cover-letters dashboard hero: a display headline, the "Write one more" CTA, and
 * a three-up stat row led by a live "written today / daily goal" progress ring.
 */
export function CoverLettersHero() {
  const letters = useCoverLetterDocumentsStore((s) => s.letters);

  // Drafts live in localStorage (client only) - keep the count 0 until mounted
  // so SSR and the first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const writtenToday = mounted
    ? letters.filter((r) => stripHtml(r.data.letter.body) && isToday(r.updatedAt)).length
    : 0;

  return (
    <section className="text-center">
      <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        Secure your dream job with
        <br className="hidden sm:block" /> AI-tailored cover letters
      </h1>

      <div className="mt-7 flex justify-center">
        <Link href="/cover-letter/new">
          <PrimaryButton>
            <Sparkles />
            Write one more
          </PrimaryButton>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {/* Progress card (spans two columns on wide screens) */}
        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border lg:col-span-2">
          <ProgressRing value={writtenToday} goal={DAILY_GOAL} />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-heading text-3xl font-extrabold text-emerald-600">
                {writtenToday}/{DAILY_GOAL}
              </p>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Today
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">Cover letters written</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Submitting 5 job applications daily could triple the speed of your job search
            </p>
          </div>
        </div>

        <StatCard
          value="~250"
          label="Job applications"
          hint="Required on average to get a single job offer"
        />
        <StatCard
          value="~84"
          label="Days to get an offer"
          hint="Industry average in your field"
        />
      </div>
    </section>
  );
}
