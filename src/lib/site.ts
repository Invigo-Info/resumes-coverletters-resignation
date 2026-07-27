/**
 * Canonical site origin, used to build absolute URLs for SEO metadata
 * (`metadataBase`, OpenGraph), the sitemap, and robots.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL - set this to your production origin
 *      (e.g. https://app.your-domain.com). Preferred.
 *   2. VERCEL_PROJECT_PRODUCTION_URL - Vercel's stable production domain, so
 *      preview/prod deploys get a correct origin without extra config.
 *   3. http://localhost:3000 - local development fallback.
 *
 * Always returns an origin with no trailing slash.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
