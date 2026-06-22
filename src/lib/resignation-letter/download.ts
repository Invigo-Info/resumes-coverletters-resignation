import { useResignationLetterStore } from "@/lib/store/resignation-letter-store";
import { exportElementToPdf } from "@/lib/pdf-export";

/**
 * Find the on-screen resignation-letter preview node to export. Multiple copies
 * can exist (desktop + mobile), so prefer the one with a visible width.
 */
function visiblePreview(): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rl-preview]"));
  return els.find((e) => e.getBoundingClientRect().width > 0) ?? els[0] ?? null;
}

/** Build the download filename from the candidate's name (with a safe default). */
function fileName() {
  const base = useResignationLetterStore.getState().fullName.trim().replace(/\s+/g, "_");
  return `${base || "resignation"}_resignation_letter.pdf`;
}

/** Render the resignation-letter preview to a margined, multi-page A4 PDF and download. */
export async function downloadResignationLetter(): Promise<void> {
  const el = visiblePreview();
  if (!el) return;
  const { design } = useResignationLetterStore.getState();
  const bg = design.theme === "dark" ? "#171717" : design.bg || "#ffffff";
  await exportElementToPdf(el, { fileName: fileName(), background: bg });
}
