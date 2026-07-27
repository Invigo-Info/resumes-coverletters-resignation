import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * XML sitemap listing the publicly indexable routes only (home + auth entry +
 * legal). The rest of the app is per-account and is excluded here and in
 * robots.ts. Add marketing/landing routes to this list as they ship.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/login", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  }));
}
