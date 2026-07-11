"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
}: {
  paneClassName?: string;
  savePillClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);

  // How many A4 pages the rendered resume spans, from real measured heights.
  const measure = useCallback(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content) return;
    const pageH = scroll.clientWidth * A4_RATIO;
    if (pageH <= 0) return;
    // -2px tolerance so a hairline overflow isn't counted as a whole extra page.
    const pages = Math.max(1, Math.ceil((content.scrollHeight - 2) / pageH));
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
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
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
          <LivePreview />
        </div>
      </div>

      <SaveStatusPill className={savePillClassName} />

      {pageCount > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-800/95 px-1.5 py-1 text-white shadow-lg">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="grid size-7 place-items-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-10 text-center text-xs font-semibold tabular-nums">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="grid size-7 place-items-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
