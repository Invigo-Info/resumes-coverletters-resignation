/**
 * Trusted years-of-experience calculation.
 *
 * The AI must NEVER compute years of experience from raw dates (it double-counts
 * overlaps and guesses when dates are vague). Instead the app computes an
 * authoritative number here - overlapping employment periods merged so shared
 * months are counted once - and hands the AI only the finished figure to state
 * verbatim. Mirrors the "years-of-experience calculation" section of the
 * Professional Summary spec.
 */

export type ExperienceDisplay = "exact" | "plus" | "omit";
export type ExperienceConfidence = "high" | "medium" | "low";

export interface ComputedExperience {
  /** Completed whole years of (overlap-merged) relevant experience, or null. */
  relevantYears: number | null;
  /** How the number should be shown: exact ("6 years"), plus ("6+"), or omit. */
  displayStyle: ExperienceDisplay;
  /** How reliable the source dates were (drives exact vs omit). */
  dateConfidence: ExperienceConfidence;
}

interface EntryDates {
  startDate?: string;
  endDate?: string;
}

interface ParsedDate {
  /** Absolute month index (year*12 + month0), for interval math. */
  month: number;
  /** True when a month was present (not just a year), for confidence. */
  hasMonth: boolean;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** "present"/"current"/"now"/"ongoing" (or blank end) means "up to today". */
function isPresent(s: string): boolean {
  return !s.trim() || /present|current|now|ongoing|to date|till date/i.test(s);
}

/**
 * Parse a free-form date string into an absolute month index. Handles
 * "Mar 2021", "March 2021", "2021-03", "03/2021", and bare "2021". Returns null
 * when no year can be found.
 */
function parseDate(raw: string): ParsedDate | null {
  const s = raw.trim();
  if (!s) return null;
  const yearMatch = s.match(/(19|20)\d{2}/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);

  // Month by name (jan, march, ...).
  const nameMatch = s.toLowerCase().match(/[a-z]{3,}/);
  let month: number | null = null;
  let hasMonth = false;
  if (nameMatch) {
    const key = nameMatch[0].slice(0, 3);
    if (key in MONTHS) {
      month = MONTHS[key];
      hasMonth = true;
    }
  }
  // Numeric month: "2021-03", "03/2021" (a 1-12 number that isn't the year).
  if (month === null) {
    const nums = s.match(/\d{1,2}/g)?.map(Number).filter((n) => n >= 1 && n <= 12);
    if (nums && nums.length) {
      month = nums[0] - 1;
      hasMonth = true;
    }
  }
  return { month: year * 12 + (month ?? 0), hasMonth };
}

/**
 * Compute overlap-merged completed years of experience from employment entries.
 * `now` is injected (defaults to the current month) so the result is testable
 * and deterministic.
 */
export function computeExperience(
  entries: EntryDates[],
  now: Date = new Date()
): ComputedExperience {
  const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const intervals: [number, number][] = [];
  let anyMonthMissing = false;
  let used = 0;

  for (const e of entries) {
    const start = parseDate(e.startDate ?? "");
    if (!start) continue; // no usable start date -> can't place this job in time
    const endStr = e.endDate ?? "";
    const end = isPresent(endStr)
      ? { month: nowMonth, hasMonth: true }
      : parseDate(endStr);
    // End before or missing -> treat as at least one month at the start.
    const endMonth = end ? Math.max(end.month, start.month) : start.month;
    if (!start.hasMonth || (end && !end.hasMonth)) anyMonthMissing = true;
    // Inclusive month span (a single "Jan 2020" job counts as 1 month).
    intervals.push([start.month, endMonth]);
    used++;
  }

  if (!used) return { relevantYears: null, displayStyle: "omit", dateConfidence: "low" };

  // Merge overlapping/adjacent intervals so shared months are counted once.
  intervals.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let [curStart, curEnd] = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    const [s, en] = intervals[i];
    if (s <= curEnd + 1) {
      curEnd = Math.max(curEnd, en);
    } else {
      months += curEnd - curStart + 1;
      [curStart, curEnd] = [s, en];
    }
  }
  months += curEnd - curStart + 1;

  const years = Math.floor(months / 12);
  // Under a full year, or vague dates: omit the number (use early-career wording).
  if (years < 1) return { relevantYears: null, displayStyle: "omit", dateConfidence: "low" };

  return {
    relevantYears: years,
    displayStyle: "exact",
    // Month precision on every entry -> high; some year-only dates -> medium.
    dateConfidence: anyMonthMissing ? "medium" : "high",
  };
}
