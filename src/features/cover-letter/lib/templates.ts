import type { CLFontId, CLLayoutId, CLSpacingId } from "@/features/cover-letter/store/cover-letter-store";

/** A cover-letter Style: a header layout + default font/color/spacing, and a real
 *  sample-image thumbnail shown in the Design -> Styles carousel. */
export interface CLTemplate {
  id: string;
  name: string;
  /** Sample preview image in /public/assets/cover-letters. */
  image: string;
  preset: {
    font: CLFontId;
    /** Accent + page background + dark theme (mirror the panel's Colors swatches). */
    accent: string;
    bg: string;
    dark: boolean;
    /** Paragraph density (Compact / Standard / Spacious). */
    spacing: CLSpacingId;
    layout: CLLayoutId;
  };
}

/**
 * ATS-friendly cover-letter styles shown in the Design -> Styles carousel. Each
 * thumbnail is a real sample letter (public/assets/cover-letters); selecting one
 * applies its full preset - font, color (accent/background/theme) and header
 * layout - so both the Fonts and the Colors controls in the Design panel update
 * to match the chosen style, and the live preview follows.
 */
const IMG = "/assets/cover-letters";

// Color presets mirror the Design panel's Colors swatches, so a selected
// template lights up the matching swatch (and applies it to the preview).
const INK = { accent: "#111827", bg: "", dark: false };
const BLUE = { accent: "#2563eb", bg: "", dark: false };
const ROSE = { accent: "#e11d48", bg: "", dark: false };
const AMBER = { accent: "#f59e0b", bg: "", dark: false };
const TEAL = { accent: "#0f766e", bg: "#e7f3ee", dark: false };
const TEAL2 = { accent: "#0d9488", bg: "#eafaf6", dark: false };
const DARK = { accent: "#ffffff", bg: "#0e4b5a", dark: true };
const GREY = { accent: "#374151", bg: "#eef0f2", dark: false };

export const coverLetterTemplates: CLTemplate[] = [
  { id: "feynman", name: "Feynman", image: `${IMG}/feynman.png`, preset: { font: "inter", ...INK, spacing: "normal", layout: "left-right" } },
  { id: "shakespeare", name: "Shakespeare", image: `${IMG}/shakespeare.png`, preset: { font: "inter", ...BLUE, spacing: "normal", layout: "contacts" } },
  { id: "napoleon", name: "Napoleon", image: `${IMG}/napoleon.png`, preset: { font: "georgia", ...ROSE, spacing: "loose", layout: "centered" } },
  { id: "newton", name: "Newton", image: `${IMG}/newton.png`, preset: { font: "georgia", ...DARK, spacing: "normal", layout: "sidebar" } },
  { id: "curie", name: "Curie", image: `${IMG}/curie.png`, preset: { font: "garamond", ...AMBER, spacing: "loose", layout: "ribbon" } },
  { id: "ampere", name: "Ampere", image: `${IMG}/ampere.png`, preset: { font: "garamond", ...TEAL, spacing: "loose", layout: "stars" } },
  { id: "turing", name: "Turing", image: `${IMG}/turing.png`, preset: { font: "inter", ...GREY, spacing: "dense", layout: "left-right" } },
  { id: "ford", name: "Ford", image: `${IMG}/ford.png`, preset: { font: "inter", ...TEAL2, spacing: "normal", layout: "contacts" } },
  { id: "lamarr", name: "Lamarr", image: `${IMG}/lamarr.png`, preset: { font: "garamond", ...BLUE, spacing: "normal", layout: "left-right" } },
  { id: "bentz", name: "Bentz", image: `${IMG}/bentz.png`, preset: { font: "georgia", ...ROSE, spacing: "loose", layout: "smallcaps" } },
  { id: "ive", name: "Ive", image: `${IMG}/ive.png`, preset: { font: "inter", ...TEAL, spacing: "dense", layout: "center-top" } },
  { id: "pharrell", name: "Pharrell", image: `${IMG}/pharrell.png`, preset: { font: "garamond", ...DARK, spacing: "loose", layout: "center-top" } },
  { id: "stallman", name: "Stallman", image: `${IMG}/stallman.png`, preset: { font: "inter", ...GREY, spacing: "dense", layout: "leftmeta" } },
];
