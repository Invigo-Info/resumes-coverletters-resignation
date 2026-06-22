import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { exportElementToPdf } from "@/lib/pdf-export";

/**
 * Find the on-screen cover-letter preview node to export. Multiple previews can
 * exist (e.g. desktop + mobile copies), so prefer the one with a visible width.
 */
function visiblePreview(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-cl-preview]"));
  return els.find((e) => e.getBoundingClientRect().width > 0) ?? els[0] ?? null;
}

/** Build the download filename from the candidate's name (with a safe default). */
function fileName() {
  const { firstName, lastName } = useCoverLetterStore.getState().personal;
  const base = [firstName, lastName].filter(Boolean).join("_").trim();
  return `${base || "cover-letter"}_cover_letter.pdf`;
}

/** Render the cover-letter preview to a margined, multi-page A4 PDF and download. */
export async function downloadCoverLetter(): Promise<void> {
  const el = visiblePreview();
  if (!el) return;
  const { design } = useCoverLetterStore.getState();
  const bg = design.dark ? "#0e4b5a" : design.bg || "#ffffff";
  await exportElementToPdf(el, { fileName: fileName(), background: bg });
}
