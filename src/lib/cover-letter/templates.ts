import type { CLFontId, CLLayoutId } from "@/lib/store/cover-letter-store";

/** A cover-letter Style: a header layout + default font/accent. */
export interface CLTemplate {
  id: string;
  name: string;
  preset: { font: CLFontId; accent: string; layout: CLLayoutId };
}

/**
 * ATS-friendly cover-letter styles shown in the Design → Styles carousel.
 * Thumbnails are generated from each preset (see CoverLetterThumb), so the
 * carousel shows real cover letters — not reused resume previews.
 */
export const coverLetterTemplates: CLTemplate[] = [
  { id: "classic", name: "Classic", preset: { font: "georgia", accent: "#111827", layout: "accent-top" } },
  { id: "modern", name: "Modern", preset: { font: "inter", accent: "#2563eb", layout: "split" } },
  { id: "spotlight", name: "Spotlight", preset: { font: "garamond", accent: "#0f766e", layout: "split" } },
  { id: "bold", name: "Bold", preset: { font: "inter", accent: "#111827", layout: "split" } },
  { id: "minimal", name: "Minimal", preset: { font: "inter", accent: "#334155", layout: "accent-top" } },
  { id: "refined", name: "Refined", preset: { font: "georgia", accent: "#1e3a8a", layout: "accent-top" } },
  { id: "fresh", name: "Fresh", preset: { font: "inter", accent: "#0d9488", layout: "split" } },
  { id: "warm", name: "Warm", preset: { font: "garamond", accent: "#b45309", layout: "accent-top" } },
  { id: "executive", name: "Executive", preset: { font: "georgia", accent: "#7c2d12", layout: "split" } },
  { id: "crisp", name: "Crisp", preset: { font: "inter", accent: "#0e7490", layout: "accent-top" } },
];
