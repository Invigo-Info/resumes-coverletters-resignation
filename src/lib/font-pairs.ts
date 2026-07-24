import type { FontId } from "@/lib/store/resume-store";
import type { ResumeTemplate } from "@/lib/templates";

/**
 * Style-specific font options for the Design panel.
 *
 * The three font cards are NOT a global font list: every resume style exposes
 * exactly three curated font PAIRS. A pair sets a Primary font (name + section
 * headings) and a Secondary font (body / bullets / dates), applied together as
 * one atomic choice. Selecting a style replaces the whole three-card set; a card
 * click applies both fonts at once. The mapping below is the single source of
 * truth (Step 5 of the brief) - add a style by extending the data, never by
 * branching in the component.
 */
export interface FontPair {
  id: string;
  primary: FontId;
  secondary: FontId;
}

/**
 * User-facing label for each font family (display only; kept separate from the
 * CSS stack because the label can differ from the font-family value - e.g. a
 * licensed family shown by name but rendered via a documented fallback).
 */
export const FONT_LABELS: Record<FontId, string> = {
  verdana: "Verdana",
  georgia: "Georgia",
  arial: "Arial",
  tahoma: "Tahoma",
  garamond: "Garamond",
  roboto: "Roboto",
  robotoFlex: "Roboto Flex",
  robotoSerif: "Roboto Serif",
  inter: "Inter",
  nunitoSans: "Nunito Sans",
  literata: "Literata",
  cactusSerif: "Cactus Classical Serif",
  lora: "Lora",
  sourceSansPro: "Source Sans Pro",
  source: "Source",
  work: "Work",
  inria: "Inria",
  dmSans: "DM Sans",
  crimson: "Crimson",
  ibmPlex: "IBM Plex",
  poppins: "Poppins",
  playfair: "Playfair",
  manrope: "Manrope",
  ubuntuMono: "Ubuntu Mono",
  tabular: "Tabular",
  googleSans: "Google Sans",
  sentient: "Sentient",
  erode: "Erode",
  satoshi: "Satoshi",
};

/**
 * CSS font-family stack for each family, used by BOTH the live preview and the
 * Design panel's own card previews (imported, never duplicated - so a card can
 * never advertise a font the resume won't actually render). Web families
 * reference the next/font CSS variable defined in layout.tsx; every stack ends
 * in a web-safe fallback so text stays readable while a web font loads.
 *
 * Licensed families we cannot ship (Google Sans, Sentient, Erode, Satoshi,
 * Tabular) map to a DOCUMENTED same-category fallback - a serif for a serif, a
 * sans for a sans - never a silent unrelated substitute.
 */
export const FONT_STACK: Record<FontId, string> = {
  // System families.
  verdana: "Verdana, Geneva, Tahoma, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  arial: "Arial, Helvetica, sans-serif",
  tahoma: "Tahoma, Geneva, Verdana, sans-serif",
  // Web families (next/font CSS variables).
  garamond: "var(--font-eb-garamond), Garamond, Georgia, serif",
  roboto: "var(--font-roboto), 'Segoe UI', Roboto, sans-serif",
  robotoFlex: "var(--font-roboto-flex), Verdana, Geneva, Tahoma, sans-serif",
  robotoSerif: "var(--font-roboto-serif), Georgia, 'Times New Roman', serif",
  inter: "var(--font-sans), 'Segoe UI', Roboto, sans-serif",
  nunitoSans: "var(--font-nunito-sans), 'Segoe UI', sans-serif",
  literata: "var(--font-literata), Georgia, serif",
  cactusSerif: "var(--font-cactus-serif), Georgia, serif",
  lora: "var(--font-lora), Georgia, serif",
  sourceSansPro: "var(--font-source-sans), 'Segoe UI', sans-serif",
  source: "var(--font-source-sans), 'Segoe UI', sans-serif",
  work: "var(--font-work-sans), 'Segoe UI', sans-serif",
  inria: "var(--font-inria-sans), 'Segoe UI', sans-serif",
  dmSans: "var(--font-dm-sans), 'Segoe UI', sans-serif",
  crimson: "var(--font-crimson), Georgia, serif",
  ibmPlex: "var(--font-ibm-plex-sans), 'Segoe UI', sans-serif",
  poppins: "var(--font-poppins), 'Segoe UI', sans-serif",
  playfair: "var(--font-playfair), Georgia, serif",
  manrope: "var(--font-manrope), 'Segoe UI', sans-serif",
  ubuntuMono: "var(--font-ubuntu-mono), 'Courier New', monospace",
  // Documented fallbacks for families we cannot ship (same category).
  tabular: "var(--font-work-sans), 'Segoe UI', Arial, sans-serif", // grotesk sans
  googleSans: "var(--font-sans), 'Segoe UI', Roboto, sans-serif", // system sans
  sentient: "var(--font-eb-garamond), Georgia, serif", // serif
  erode: "var(--font-eb-garamond), Georgia, serif", // serif
  satoshi: "var(--font-sans), 'Segoe UI', Arial, sans-serif", // geometric sans
};

/** Short helper to author a pair. */
const pair = (id: string, primary: FontId, secondary: FontId): FontPair => ({
  id,
  primary,
  secondary,
});

/**
 * The complete style-to-font configuration (brief Step 5), keyed by the style
 * stem (the template's preview-file name without extension - `bentz`, `napoleon`,
 * ...). Each style lists exactly three pairs; the first is its Option-1 default.
 */
export const STYLE_FONT_PAIRS: Record<string, [FontPair, FontPair, FontPair]> = {
  bentz: [
    pair("bentz-1", "verdana", "verdana"),
    pair("bentz-2", "georgia", "arial"),
    pair("bentz-3", "garamond", "garamond"),
  ],
  napoleon: [
    pair("napoleon-1", "nunitoSans", "nunitoSans"),
    pair("napoleon-2", "googleSans", "sentient"),
    pair("napoleon-3", "literata", "cactusSerif"),
  ],
  lamarr: [
    pair("lamarr-1", "inter", "inter"),
    pair("lamarr-2", "robotoSerif", "robotoFlex"),
    pair("lamarr-3", "literata", "literata"),
  ],
  pharrell: [
    pair("pharrell-1", "roboto", "roboto"),
    pair("pharrell-2", "lora", "sourceSansPro"),
    pair("pharrell-3", "garamond", "garamond"),
  ],
  hopper: [
    pair("hopper-1", "robotoFlex", "robotoFlex"),
    pair("hopper-2", "georgia", "arial"),
    pair("hopper-3", "garamond", "garamond"),
  ],
  shakespeare: [
    pair("shakespeare-1", "work", "work"),
    pair("shakespeare-2", "inria", "dmSans"),
    pair("shakespeare-3", "erode", "garamond"),
  ],
  feynman: [
    pair("feynman-1", "arial", "arial"),
    pair("feynman-2", "tahoma", "tahoma"),
    pair("feynman-3", "verdana", "verdana"),
  ],
  ampere: [
    pair("ampere-1", "dmSans", "dmSans"),
    pair("ampere-2", "crimson", "crimson"),
    pair("ampere-3", "ibmPlex", "ibmPlex"),
  ],
  stallman: [
    pair("stallman-1", "tabular", "tabular"),
    pair("stallman-2", "inria", "inria"),
    pair("stallman-3", "ibmPlex", "ibmPlex"),
  ],
  ford: [
    pair("ford-1", "inter", "inter"),
    pair("ford-2", "erode", "poppins"),
    pair("ford-3", "ibmPlex", "ibmPlex"),
  ],
  newton: [
    pair("newton-1", "source", "source"),
    pair("newton-2", "playfair", "ibmPlex"),
    pair("newton-3", "garamond", "garamond"),
  ],
  turing: [
    pair("turing-1", "dmSans", "dmSans"),
    pair("turing-2", "garamond", "source"),
    pair("turing-3", "crimson", "crimson"),
  ],
  curie: [
    pair("curie-1", "work", "work"),
    pair("curie-2", "satoshi", "erode"),
    pair("curie-3", "crimson", "crimson"),
  ],
  ive: [
    pair("ive-1", "manrope", "manrope"),
    pair("ive-2", "ubuntuMono", "ubuntuMono"),
    pair("ive-3", "georgia", "georgia"),
  ],
};

/** Safe global pair used when a style has no configured mapping (edge case). */
const FALLBACK_PAIRS: [FontPair, FontPair, FontPair] = [
  pair("fallback-1", "georgia", "georgia"),
  pair("fallback-2", "georgia", "arial"),
  pair("fallback-3", "garamond", "garamond"),
];

/** The style stem (preview-file name without extension) that keys the config. */
export function styleStem(template: ResumeTemplate): string {
  return template.file.replace(/\.[^.]+$/, "");
}

/** The three font pairs offered for a given template style (always exactly 3). */
export function fontPairsForTemplate(template: ResumeTemplate): FontPair[] {
  return STYLE_FONT_PAIRS[styleStem(template)] ?? FALLBACK_PAIRS;
}
