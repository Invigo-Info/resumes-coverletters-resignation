import { useResumeStore } from "@/lib/store/resume-store";
import { exportElementToPdf } from "@/lib/pdf-export";

/** The currently visible resume-preview element (write/design/improve/mobile). */
function visiblePreview(): HTMLElement | null {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-resume-preview]")
  );
  return els.find((e) => e.getBoundingClientRect().width > 0) ?? els[0] ?? null;
}

function fileName() {
  const { firstName, lastName } = useResumeStore.getState().personal;
  const base = [firstName, lastName].filter(Boolean).join("_").trim();
  return `${base || "resume"}.pdf`;
}

/**
 * Render the live resume preview to a margined, multi-page A4 PDF and download.
 */
export async function downloadResume(): Promise<void> {
  const el = visiblePreview();
  if (!el) return;
  const bg = useResumeStore.getState().design.bg || "#ffffff";
  await exportElementToPdf(el, { fileName: fileName(), background: bg });
}
