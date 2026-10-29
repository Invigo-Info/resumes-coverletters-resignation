import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Without one, an iOS or Android home-screen bookmark gets a screenshot of the
 * page instead of an icon, and the app opens in a full browser chrome with the
 * URL bar - which is the difference between something that feels installed and
 * a shortcut nobody taps twice.
 *
 * `display: "standalone"` and a `start_url` of /dashboard are deliberate: a
 * returning user who installed this wants their documents, not the marketing
 * landing page. Signed-out users still get routed to /login by the route gate,
 * so this is safe for both.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Resumewriter.ai",
    short_name: "Resumewriter",
    description:
      "Create, edit and tailor resumes, cover letters, and resignation letters with AI assistance.",
    start_url: "/dashboard",
    display: "standalone",
    // Matches --background so the splash screen does not flash white-then-grey.
    background_color: "#f6f7f9",
    // The browser chrome tint; --primary.
    theme_color: "#1170CD",
    orientation: "portrait-primary",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // `maskable` lets Android crop to its own shape without clipping the
        // glyph. Same asset: the mark already sits inside a safe margin.
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
