/**
 * Backend-independent guards for AI-generated resume bullets.
 *
 * The model is told to avoid duplicates and invented metrics in the prompt, but
 * a prompt is a request, not a guarantee. These helpers verify the output in
 * code so a repeat or a fabricated number never reaches the resume:
 *
 * - normalizeBullet / jaccard / isNearDuplicate / dedupeSuggestions: catch exact
 *   and near-duplicate suggestions (against the exclusion history and each other).
 * - hasFakeMetric: catch invented numbers in title-only suggestions, which have
 *   no supplied context that could justify a measurement.
 *
 * All non-ASCII characters are written as escapes so the no-emoji / no-dash gate
 * stays green.
 */

// Built from char codes so the source stays pure ASCII (the no-emoji / no-dash
// gate rejects literal bullet and dash glyphs).
// Leading list glyphs: bullet, triangular bullet, white bullet, hyphen-bullet.
const BULLET_CHARS = String.fromCharCode(0x2022, 0x2023, 0x25e6, 0x2043);
// Curly single quotes.
const CURLY_CHARS = String.fromCharCode(0x2018, 0x2019);
// En dash, em dash.
const DASH_CHARS = String.fromCharCode(0x2013, 0x2014);
const LIST_GLYPHS = new RegExp(`^[\\s${BULLET_CHARS}*\\-]+`);
const CURLY_QUOTES = new RegExp(`[${CURLY_CHARS}]`, "g");
const LONG_DASHES = new RegExp(`[${DASH_CHARS}]`, "g");

/**
 * Reduce a bullet to a comparison key: lowercase, tags and leading list glyphs
 * stripped, trailing punctuation dropped, curly quotes and dashes flattened,
 * whitespace collapsed. Two bullets that differ only in formatting normalize to
 * the same string.
 */
export function normalizeBullet(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(LIST_GLYPHS, "")
    .replace(CURLY_QUOTES, "'")
    .replace(LONG_DASHES, "-")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Content words (length > 2) of a normalized bullet, for overlap scoring. */
function contentTokens(s: string): Set<string> {
  return new Set(
    normalizeBullet(s)
      .split(" ")
      .filter((w) => w.length > 2)
  );
}

/** Token-set Jaccard similarity of two bullets: 0 (disjoint) to 1 (identical). */
export function jaccard(a: string, b: string): number {
  const A = contentTokens(a);
  const B = contentTokens(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const t of A) if (B.has(t)) intersection++;
  return intersection / (A.size + B.size - intersection);
}

/**
 * True when `candidate` is an exact-normalized or high-overlap match of any
 * bullet in `pool`. The default 0.8 threshold flags "lightly reworded" repeats
 * without rejecting genuinely different bullets that share a few common words.
 */
export function isNearDuplicate(
  candidate: string,
  pool: string[],
  threshold = 0.8
): boolean {
  const norm = normalizeBullet(candidate);
  if (!norm) return false;
  return pool.some(
    (p) => normalizeBullet(p) === norm || jaccard(candidate, p) >= threshold
  );
}

/**
 * Keep only the candidates that are neither near-duplicates of `exclude` nor of
 * an earlier kept candidate. Order is preserved and blanks are dropped.
 */
export function dedupeSuggestions(
  candidates: string[],
  exclude: string[],
  threshold = 0.8
): string[] {
  const kept: string[] = [];
  for (const raw of candidates) {
    const text = (raw ?? "").trim();
    if (!text) continue;
    if (isNearDuplicate(text, exclude, threshold)) continue;
    if (isNearDuplicate(text, kept, threshold)) continue;
    kept.push(text);
  }
  return kept;
}

// Currency signs: dollar (ASCII), pound, euro.
const CURRENCY = "\\$\\u00A3\\u20AC";
const METRIC_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?\s?%/, // 35% / 12.5 %
  new RegExp(`[${CURRENCY}]\\s?\\d`), // $50 / currency sign then digit
  /\b\d[\d,]*\s?(?:k|m|bn|million|billion|thousand)\b/i, // 50k / 2 million
  /\btop\s?\d+\b/i, // top 10
  /\b\d[\d,]*\s?(?:clients?|customers?|users?|people|employees?|staff|members?|teams?|projects?|accounts?|stores?|locations?|hours?|days?|weeks?|months?|years?)\b/i,
  /\b\d{3,}\b/, // any bare number of 100+
];

/**
 * True when a bullet contains a measurement a title-only suggestion could not
 * legitimately know: a percentage, a currency amount, an abbreviated magnitude
 * (50k, 2m), a ranking (top 10), or a digit paired with a counting noun
 * (20 clients). Suggestions generated from a job title alone have no supplied
 * context, so any such number is invented and gets dropped. Rewrites are NOT
 * filtered this way - there the number may come from the source bullet, which
 * the rewrite prompt already protects.
 */
export function hasFakeMetric(text: string): boolean {
  const t = text || "";
  return METRIC_PATTERNS.some((re) => re.test(t));
}
