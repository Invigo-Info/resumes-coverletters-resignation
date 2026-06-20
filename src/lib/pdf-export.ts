/**
 * Shared "DOM element -> multi-page A4 PDF" exporter used by the resume, cover
 * letter and resignation letter downloads.
 *
 * Unlike a naive full-bleed export, this adds a uniform margin on all four sides
 * and slices the rendered canvas into page-sized chunks, so content never bleeds
 * into (or gets cut off at) the page edges. Heavy libs are dynamically imported
 * so they stay out of the initial bundle.
 */

export interface PdfExportOptions {
  fileName: string;
  /** Page + margin fill color (match the document background). Default white. */
  background?: string;
  /** Margin on every side, in points. Default 40pt (~0.55in). */
  margin?: number;
  /**
   * Width (px) to use when the element isn't laid out on screen (e.g. a preview
   * pane hidden behind `display:none` on mobile). The element is cloned into an
   * off-screen container of this width so html2canvas has real pixels to draw.
   * Default 816px (US-Letter width at 96dpi).
   */
  captureWidth?: number;
}

/** "#171717" -> [23, 23, 23]; falls back to white on bad input. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function exportElementToPdf(
  el: HTMLElement,
  opts: PdfExportOptions
): Promise<void> {
  const {
    fileName,
    background = "#ffffff",
    margin = 40,
    captureWidth = 816,
  } = opts;

  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro").then((m) => m.default),
  ]);

  // If the element isn't rendered (e.g. the preview pane is `display:none` on
  // mobile), html2canvas would capture a blank page. Clone it into an off-screen
  // container with a real width so there's something to draw.
  let target = el;
  let cleanup: (() => void) | null = null;
  if (el.getBoundingClientRect().width < 1) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;left:-100000px;top:0;width:${captureWidth}px;background:${background};pointer-events:none;z-index:-1;`;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.width = "100%";
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    target = clone;
    cleanup = () => document.body.removeChild(wrap);
    // Let the browser lay the clone out (and settle fonts) before capture.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: background,
      useCORS: true,
      logging: false,
      windowWidth: target === el ? undefined : captureWidth,
      // Drop the editor-only active-bullet highlight from the exported PDF.
      onclone: (doc: Document) => {
        doc
          .querySelectorAll("[data-active-block]")
          .forEach((node) => node.removeAttribute("data-active-block"));
      },
    });
  } finally {
    cleanup?.();
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // The usable content box inside the margins.
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  // How many canvas pixels map to one point at our render width, and therefore
  // how many canvas pixels fit in a single page's content height.
  const pxPerPt = canvas.width / contentW;
  const pageSlicePx = Math.max(1, Math.floor(contentH * pxPerPt));

  const [r, g, b] = hexToRgb(background);

  // A reusable canvas we draw each page-slice into before adding it to the PDF.
  const sliceCanvas = document.createElement("canvas");
  const ctx = sliceCanvas.getContext("2d");
  if (!ctx) return;

  const totalPx = canvas.height;
  let renderedPx = 0;
  let first = true;

  while (renderedPx < totalPx) {
    const slicePx = Math.min(pageSlicePx, totalPx - renderedPx);

    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    // Paint the background first so transparent areas keep the page color.
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      renderedPx,
      canvas.width,
      slicePx, // source rect
      0,
      0,
      canvas.width,
      slicePx // dest rect
    );

    const sliceImg = sliceCanvas.toDataURL("image/png");
    const sliceHpt = slicePx / pxPerPt;

    if (!first) pdf.addPage();
    // Fill the whole page (incl. margins) with the document background, then
    // place the slice inside the margins.
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, pageH, "F");
    pdf.addImage(sliceImg, "PNG", margin, margin, contentW, sliceHpt);

    first = false;
    renderedPx += slicePx;
  }

  pdf.save(fileName);
}
