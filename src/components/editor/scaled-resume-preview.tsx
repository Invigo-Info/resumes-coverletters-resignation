"use client";

import { useEffect, useRef, useState } from "react";
import { LivePreview } from "./live-preview";
import type { ResumeState } from "@/lib/store/resume-store";

// The resume renders at a page-like width and is scaled to the container's
// measured width, so it stays crisp and correctly proportioned at any size.
const PAGE_WIDTH = 816;

/**
 * A live, read-only resume render scaled to FILL its parent. The parent must be
 * relatively positioned and own the size/aspect box (with overflow-hidden); this
 * fills it (`absolute inset-0`) and scales the fixed-width page to fit. Shared by
 * the dashboard card, the Design-tab style carousel, and the template picker so
 * every thumbnail renders identically to the real editor preview.
 */
export function ScaledResumePreview({ state }: { state: ResumeState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (w: number) => setScale(w / PAGE_WIDTH);
    apply(el.clientWidth);
    const ro = new ResizeObserver((entries) => apply(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          width: PAGE_WIDTH,
          transform: `scale(${scale})`,
          // Hide until measured so we never flash a full-size, unscaled page.
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <LivePreview previewOnly thumbnail state={state} />
      </div>
    </div>
  );
}
