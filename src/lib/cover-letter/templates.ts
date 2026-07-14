import type { CLFontId, CLLayoutId } from "@/lib/store/cover-letter-store";

/** A cover-letter Style: a header layout + default font/accent, and a real
 *  sample-image thumbnail shown in the Design -> Styles carousel. */
export interface CLTemplate {
  id: string;
  name: string;
  /** Sample preview image in /public/assets/cover-letters. */
  image: string;
  preset: { font: CLFontId; accent: string; layout: CLLayoutId };
}

/**
 * ATS-friendly cover-letter styles shown in the Design -> Styles carousel. Each
 * thumbnail is a real sample letter (public/assets/cover-letters); selecting one
 * applies its preset (font, accent, header layout) to the live preview. The
 * samples are clean monochrome letters, so every accent stays neutral - the
 * variety is in the header arrangement and font.
 */
const IMG = "/assets/cover-letters";
const INK = "#111827";

export const coverLetterTemplates: CLTemplate[] = [
  { id: "feynman", name: "Feynman", image: `${IMG}/feynman.png`, preset: { font: "inter", accent: INK, layout: "left-right" } },
  { id: "shakespeare", name: "Shakespeare", image: `${IMG}/shakespeare.png`, preset: { font: "inter", accent: INK, layout: "contacts" } },
  { id: "napoleon", name: "Napoleon", image: `${IMG}/napoleon.png`, preset: { font: "georgia", accent: INK, layout: "centered" } },
  { id: "newton", name: "Newton", image: `${IMG}/newton.png`, preset: { font: "georgia", accent: INK, layout: "sidebar" } },
  { id: "curie", name: "Curie", image: `${IMG}/curie.png`, preset: { font: "garamond", accent: INK, layout: "ribbon" } },
  { id: "ampere", name: "Ampere", image: `${IMG}/ampere.png`, preset: { font: "garamond", accent: INK, layout: "stars" } },
  { id: "turing", name: "Turing", image: `${IMG}/turing.png`, preset: { font: "inter", accent: INK, layout: "left-right" } },
  { id: "ford", name: "Ford", image: `${IMG}/ford.png`, preset: { font: "inter", accent: INK, layout: "contacts" } },
  { id: "lamarr", name: "Lamarr", image: `${IMG}/lamarr.png`, preset: { font: "garamond", accent: INK, layout: "left-right" } },
  { id: "bentz", name: "Bentz", image: `${IMG}/bentz.png`, preset: { font: "georgia", accent: INK, layout: "smallcaps" } },
  { id: "ive", name: "Ive", image: `${IMG}/ive.png`, preset: { font: "inter", accent: INK, layout: "center-top" } },
  { id: "pharrell", name: "Pharrell", image: `${IMG}/pharrell.png`, preset: { font: "garamond", accent: INK, layout: "center-top" } },
  { id: "stallman", name: "Stallman", image: `${IMG}/stallman.png`, preset: { font: "inter", accent: INK, layout: "leftmeta" } },
];
