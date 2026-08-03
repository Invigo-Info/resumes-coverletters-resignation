import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/**
 * robots.txt. Public marketing/legal pages are crawlable; every per-account app
 * surface and the API are disallowed - they render personalized or authed
 * content with nothing to index, so keeping crawlers out avoids indexing empty
 * or private pages.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/account",
        "/apply",
        "/builder",
        "/cover-letter",
        "/cover-letters",
        "/dashboard",
        "/interview-prep",
        "/jobs",
        "/payment",
        "/resignation-letter",
        "/resignation-letters",
        "/resume-creation-menu",
        "/resumes",
        "/style-guide",
        "/tailoring",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
