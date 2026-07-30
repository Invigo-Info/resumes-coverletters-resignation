"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LivePreview } from "@/components/editor/live-preview";
import { previewStateFromDoc } from "@/lib/store/resume-store";
import type { ResumeDocData } from "@/lib/store/documents-store";

// The live preview renders at a page-like width; the thumbnail scales that whole
// page down to the card. A4-ish ratio so the crop reads as a sheet of paper.
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

/**
 * A live, scaled-down render of the user's OWN resume in its chosen template -
 * the same component that drives the editor preview and the PDF, shrunk to fit a
 * card thumbnail. Reflects the real content, template, colors, fonts and layout,
 * so the card shows what the resume actually looks like (not a stock image).
 *
 * The page is rendered at a fixed width and scaled to the container's measured
 * width, so it stays crisp and correctly proportioned at any card size.
 */
export function ResumeThumbnail({
  id,
  data,
}: {
  id: string;
  data: ResumeDocData;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  // Measure the box and scale the fixed-width page to fit it exactly.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (w: number) => setScale(w / PAGE_WIDTH);
    apply(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      apply(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build a read-only render state from this record (memoized so the preview
  // doesn't rebuild on every parent render).
  const state = useMemo(
    () => previewStateFromDoc({ ...data, id }),
    [data, id]
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      {/* The page render is not interactive here - it's a thumbnail. */}
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          width: PAGE_WIDTH,
          transform: `scale(${scale})`,
          // Hide until measured so we never flash a full-size, unscaled page.
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <LivePreview previewOnly state={state} />
      </div>
    </div>
  );
}
