/**
 * Resume color themes for the Design panel.
 *
 * A swatch is NOT one text color - it is a complete, readable theme. Selecting
 * one repaints the colored sidebar, the page background, headings, dividers and
 * (for the dark theme) the body text together, so every combination stays legible.
 * Three behavior classes, matching the reference:
 *   - High contrast: colored sidebar, WHITE page, dark/black body text.
 *   - Tinted:        colored sidebar, a pale tint page, dark theme-colored text.
 *   - Dark:          both panels dark, body text switched to light.
 *
 * Tokens actually consumed by the preview:
 *   swatch     - the circle shown in the panel (bright, recognizable).
 *   accent     - headings, job title, links and divider rules (design.color).
 *   contentBg  - main page background (design.bg; "" means white).
 *   sidebarBg  - the colored sidebar panel (sidebar text stays white).
 *   darkText   - true only for the dark theme: content text becomes light.
 * accent/contentBg are mirrored into design.color/bg so existing consumers keep
 * working; sidebarBg/darkText are resolved from the theme at render time.
 */
export interface ResumeTheme {
  id: string;
  name: string;
  swatch: string;
  accent: string;
  contentBg: string;
  sidebarBg: string;
  darkText: boolean;
}

export const RESUME_THEMES: ResumeTheme[] = [
  // High-contrast: colored sidebar, white page, dark body text. Swatches match
  // the reference palette exactly (pure black, azure, rose, amber); accents are
  // the readable dark variant used for headings/links/dividers.
  { id: "black", name: "Black", swatch: "#000000", accent: "#111827", contentBg: "", sidebarBg: "#1f2937", darkText: false },
  { id: "blue", name: "Blue", swatch: "#0284c7", accent: "#0369a1", contentBg: "", sidebarBg: "#0c4a6e", darkText: false },
  { id: "rose", name: "Rose", swatch: "#e11d48", accent: "#be123c", contentBg: "", sidebarBg: "#6b1f3a", darkText: false },
  { id: "amber", name: "Amber", swatch: "#f59e0b", accent: "#422006", contentBg: "#f8f0c8", sidebarBg: "#78350f", darkText: false },
  // Tinted: colored sidebar, pale tinted page, dark theme-colored text. The
  // bright swatch (emerald/teal/cyan) reads on the pale card; the accent is the
  // darker readable variant used on the tinted page.
  { id: "emerald", name: "Emerald", swatch: "#10a37f", accent: "#245e63", contentBg: "#f2fae7", sidebarBg: "#176b5c", darkText: false },
  { id: "teal", name: "Teal", swatch: "#0d9488", accent: "#0f766e", contentBg: "#eef7f0", sidebarBg: "#134e4a", darkText: false },
  { id: "cyan", name: "Cyan", swatch: "#06b6d4", accent: "#0e7490", contentBg: "#ecfeff", sidebarBg: "#155e75", darkText: false },
  // Dark: both panels dark (near-black page), silver swatch, body text light.
  { id: "dark", name: "Dark", swatch: "#d1d5db", accent: "#e5e7eb", contentBg: "#111827", sidebarBg: "#030712", darkText: true },
];

export const DEFAULT_THEME_ID = "black";

/** Look up a theme by id (undefined if unknown). */
export function getResumeTheme(id: string | undefined): ResumeTheme | undefined {
  return id ? RESUME_THEMES.find((t) => t.id === id) : undefined;
}

/**
 * Resolve the active theme from the design state: by explicit id first, else by
 * matching the accent + page background a swatch previously wrote. Lets a resume
 * saved before themes (only color/bg) still light up the right sidebar.
 */
export function resolveResumeTheme(
  themeId: string | undefined,
  color: string,
  bg: string
): ResumeTheme | undefined {
  return (
    getResumeTheme(themeId) ??
    RESUME_THEMES.find(
      (t) => t.accent === color && (t.contentBg || "") === (bg || "")
    )
  );
}
