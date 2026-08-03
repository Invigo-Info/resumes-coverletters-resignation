"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/utilities/utils";
import { LivePreview } from "./live-preview";
import { SaveStatusPill } from "./save-status-pill";

// A4 page aspect ratio (height / width). On screen the resume paper is drawn at
// the pane's full width, so one printed page is that width times this ratio tall.
const A4_RATIO = 297 / 210;

/**
 * The resume preview as its own fixed-height scroll region, with a page pager
 * pinned at the bottom (like resume.co). The pager appears only when the resume
 * spans more than one A4 page; prev/next scroll the pane a page at a time and the
 * count tracks the scroll position. The Saved pill stays pinned bottom-left.
 */
export function PreviewPane({
  paneClassName,
  savePillClassName,
  zoom = 1,
  previewOnly = false,
}: {
  paneClassName?: string;
  savePillClassName?: string;
  /** On-screen magnification of the resume (1 = actual size). Enlarges the
   *  preview text without affecting the exported PDF, which is captured from the
   *  element's natural (unzoomed) layout size. */
  zoom?: number;
  /** Render the resume WITHOUT editor-only highlights (the blue active-section /
   *  header outline). Used on tabs where the preview is view-only - e.g. Design,
   *  where nothing is being edited - so theme colors show truthfully instead of
   *  the personal/contact header staying blue. */
  previewOnly?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);

  // How many A4 pages the rendered resume spans. Measured from the resume paper
  // itself in RENDERED pixels (getBoundingClientRect), so the page height is the
  // paper's own rendered width x the A4 ratio: the on-screen zoom scales width
  // and height together and cancels out, making the count correct at any
  // magnification (the old width-vs-zoomed-height mix under-counted).
  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const paper = content.querySelector<HTMLElement>("[data-resume-preview]");
    if (!paper) return;
    const rect = paper.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pageH = rect.width * A4_RATIO;
    // -2px tolerance so a hairline overflow isn't counted as a whole extra page.
    const pages = Math.max(1, Math.ceil((rect.height - 2) / pageH));
    setPageCount(pages);
  }, []);

  useEffect(() => {
    measure();
    const content = contentRef.current;
    const scroll = scrollRef.current;
    if (!content || !scroll) return;
    // Recompute when the resume grows/shrinks (live edits) or the pane resizes.
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(scroll);
    const paper = content.querySelector("[data-resume-preview]");
    if (paper) ro.observe(paper);
    window.addEventListener("resize", measure);
    // Web fonts load asynchronously and change the resume height; re-measure on
    // the next frame and once fonts settle so the pager appears without needing
    // a manual scroll or resize.
    const raf = requestAnimationFrame(measure);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  // The pane viewport is not exactly one A4 page tall, so we can't scroll by the
  // printed page height (it would overshoot when the last page is only a sliver).
  // Instead divide the actual scrollable range into (pageCount - 1) equal steps -
  // one per page boundary - so paging always lands cleanly, first page to last.
  const stepPx = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || pageCount <= 1) return 0;
    return (scroll.scrollHeight - scroll.clientHeight) / (pageCount - 1);
  }, [pageCount]);

  // Keep the displayed page in sync with the scroll position.
  const onScroll = useCallback(() => {
    const scroll = scrollRef.current;
    const step = stepPx();
    if (!scroll || step <= 0) return;
    const p = 1 + Math.round(scroll.scrollTop / step);
    setPage((prev) => {
      const next = Math.min(pageCount, Math.max(1, p));
      return next === prev ? prev : next;
    });
  }, [pageCount, stepPx]);

  const goTo = (target: number) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const clamped = Math.min(Math.max(1, target), pageCount);
    scroll.scrollTo({ top: (clamped - 1) * stepPx(), behavior: "smooth" });
    setPage(clamped);
  };

  return (
    <div
      className={cn(
        "relative h-[calc(100vh-7rem)] overflow-hidden rounded-2xl shadow-card-lg ring-1 ring-border",
        paneClassName
      )}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto rounded-2xl"
      >
        <div ref={contentRef}>
          {/* Zoom wraps the resume (not the measured container) so contentRef's
              scrollHeight reflects the magnified size and paging stays accurate. */}
          <div style={zoom !== 1 ? { zoom } : undefined}>
            <LivePreview previewOnly={previewOnly} />
          </div>
        </div>
      </div>

      <SaveStatusPill className={savePillClassName} />

      {/* Vertical page pager, pinned to the right edge of the pane (like
          resume.co): an up chevron, every page number stacked with the current
          one highlighted, then a down chevron. Only shown when the resume spans
          more than one printed page. It sits outside the scroll region, so it
          stays put while the preview scrolls. */}
      {pageCount > 1 && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-full bg-neutral-800/95 px-1 py-1.5 text-white shadow-lg">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="grid size-6 place-items-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <ChevronUp className="size-4" />
          </button>
          {Array.from({ length: pageCount }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                type="button"
                onClick={() => goTo(n)}
                aria-label={`Page ${n}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60",
                  active ? "text-white" : "text-white/45 hover:text-white/80"
                )}
              >
                {n}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="grid size-6 place-items-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
