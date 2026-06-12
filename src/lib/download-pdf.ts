import { useResumeStore } from "@/lib/store/resume-store";

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
 * Render the live resume preview to a multi-page A4 PDF and trigger a download.
 * Heavy libs are dynamically imported so they stay out of the initial bundle.
 */
export async function downloadResume(): Promise<void> {
  const el = visiblePreview();
  if (!el) return;

  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro").then((m) => m.default),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(img, "PNG", 0, position, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }

  pdf.save(fileName());
}
