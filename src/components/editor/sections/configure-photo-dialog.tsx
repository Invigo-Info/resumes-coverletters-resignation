"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileUp,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Exported avatar size (square canvas), and the crop-circle share of the frame. */
const OUT = 512;
const CIRCLE_RATIO = 0.9; // circle diameter as a fraction of the frame height
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/** Nudge distance (px) when repositioning with the arrow keys. */
const NUDGE = 8;

interface Offset {
  x: number;
  y: number;
}

/**
 * "Configure photo" dialog.
 *
 * Opens on an empty drop zone; Save stays disabled until an image is supplied.
 * Once `src` is set the drop zone is replaced by the crop stage: the photo fills
 * a rectangular frame, and a circular spotlight (bright inside, dimmed outside)
 * marks exactly what becomes the round avatar. The slider zooms, dragging (or the
 * arrow keys) repositions, and the rotate button turns the photo 90 degrees. Save
 * re-draws that transform onto a square canvas, cropping to the circle.
 *
 * File validation lives with the caller, which passes back a `src` (or nothing,
 * if it rejected the file) - so a too-large or wrong-format image never reaches
 * the cropper.
 */
export function ConfigurePhotoDialog({
  open,
  src,
  accept,
  busy,
  onFile,
  onCancel,
  onSave,
}: {
  open: boolean;
  /** Object URL of an accepted image, or null while the drop zone is showing. */
  src: string | null;
  accept: string;
  /** True while the caller is validating a picked file. */
  busy?: boolean;
  onFile: (file: File) => void;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees, always a multiple of 90
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The crop frame is responsive (w-full), so its pixel size - which the crop
  // math needs - is measured rather than fixed.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const circle = frame ? Math.round(frame.h * CIRCLE_RATIO) : 0;

  // Reset the transform whenever a new image is loaded (or the dialog reopens).
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
    setSaving(false);
  }, [src, open]);

  /** Reset zoom, rotation and position back to the default framing. */
  function resetTransform() {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }

  /** Step the zoom by `delta`, clamped to the allowed range (for the +/- icons). */
  function stepZoom(delta: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));
  }

  // Measure the crop frame (and track resizes) while the crop stage is shown.
  useEffect(() => {
    const el = frameRef.current;
    if (!open || !src || !el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFrame({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, src]);

  /**
   * Scale that makes the (possibly rotated) image exactly cover the crop CIRCLE
   * at zoom 1 - the smallest zoom that still fills the avatar, so the whole
   * subject is visible before the user zooms in. Rotating by 90/270 swaps which
   * edge has to do the covering.
   */
  const coverScale = useCallback(() => {
    if (!natural || circle <= 0) return 1;
    const swapped = rotation % 180 !== 0;
    const w = swapped ? natural.h : natural.w;
    const h = swapped ? natural.w : natural.h;
    return circle / Math.min(w, h);
  }, [natural, circle, rotation]);

  /**
   * Clamp the offset so the image never uncovers the crop circle - dragging can
   * move the photo, but not off the edge leaving a bare wedge in the avatar.
   */
  const clamp = useCallback(
    (o: Offset): Offset => {
      if (!natural || circle <= 0) return { x: 0, y: 0 };
      const s = coverScale() * zoom;
      const swapped = rotation % 180 !== 0;
      const w = (swapped ? natural.h : natural.w) * s;
      const h = (swapped ? natural.w : natural.h) * s;
      const maxX = Math.max(0, (w - circle) / 2);
      const maxY = Math.max(0, (h - circle) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [natural, circle, zoom, rotation, coverScale]
  );

  // Re-clamp when zoom, rotation, or the frame size shrinks the allowed travel.
  useEffect(() => {
    setOffset((o) => clamp(o));
  }, [zoom, rotation, frame, clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp(e: React.PointerEvent) {
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const map: Record<string, Offset> = {
      ArrowUp: { x: 0, y: -NUDGE },
      ArrowDown: { x: 0, y: NUDGE },
      ArrowLeft: { x: -NUDGE, y: 0 },
      ArrowRight: { x: NUDGE, y: 0 },
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    setOffset((o) => clamp({ x: o.x + d.x, y: o.y + d.y }));
  }

  /** Re-draw the on-screen transform onto a square canvas, cropped to the circle. */
  function save() {
    if (!src || !natural || !frame || circle <= 0) return;
    setSaving(true); // brief loading state while the crop is drawn + handed back
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const k = OUT / circle; // screen pixels within the circle -> output pixels
    const s = coverScale() * zoom * k;

    // Fill first: a rotated photo can leave corners bare inside the square, and
    // the avatar is displayed round anyway.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);

    const img = new window.Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(OUT / 2 + offset.x * k, OUT / 2 + offset.y * k);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        (-natural.w * s) / 2,
        (-natural.h * s) / 2,
        natural.w * s,
        natural.h * s
      );
      ctx.restore();
      onSave(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = src;
  }

  const s = coverScale() * zoom;
  const ready = !!natural && !!frame;
  const canSave = !!src && ready && !busy && !saving;
  // Filled portion of the zoom track (primary up to the thumb, muted after).
  const zoomPct = ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/15 supports-backdrop-filter:backdrop-blur-none"
        className="rounded-2xl p-7 sm:max-w-120"
      >
        <div className="flex items-start justify-between gap-4">
          <DialogTitle className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Configure photo
          </DialogTitle>
          {/* 40x40 close target (spec), behaves like Cancel. */}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close without saving"
            className="-mr-1.5 -mt-1.5 grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <X className="size-5" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Upload a photo, then drag and zoom to choose the part that becomes your
          profile picture.
        </DialogDescription>

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = ""; // re-picking the same file must still fire
            if (file) onFile(file);
          }}
        />

        {!src ? (
          /* Empty state: drop zone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onFile(file);
            }}
            onClick={() => !busy && fileRef.current?.click()}
            className={cn(
              "mt-2 flex h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            {busy ? (
              <Loader2 className="size-9 animate-spin text-primary" />
            ) : (
              <FileUp className="size-9 text-muted-foreground" strokeWidth={1.5} />
            )}
            <p className="text-sm text-muted-foreground">
              {busy ? (
                "Checking your photo…"
              ) : (
                <>
                  Drag and drop your photo here or
                  <br />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    choose the image
                  </button>{" "}
                  to upload
                </>
              )}
            </p>
          </div>
        ) : (
          /* Loaded: crop stage - photo fills a frame with a circular spotlight. */
          <>
            <div
              ref={frameRef}
              className="relative mt-2 aspect-3/2 w-full select-none overflow-hidden rounded-2xl bg-neutral-800"
            >
              {/* Draggable photo layer (fills the frame; clipped by it). */}
              <div
                role="application"
                aria-label="Drag to reposition the photo, or use the arrow keys"
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={onKeyDown}
                className="absolute inset-0 cursor-grab touch-none outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60 active:cursor-grabbing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  // max-w-none: Tailwind Preflight caps imgs at max-width:100%,
                  // which would clamp the zoomed photo to the frame width (so
                  // zoom appears dead and the image stretches). Opt out of it.
                  className="max-w-none"
                  onLoad={(e) =>
                    setNatural({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                  style={
                    ready
                      ? {
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: natural!.w * s,
                          height: natural!.h * s,
                          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                        }
                      : { opacity: 0 }
                  }
                />
              </div>

              {/* Circular spotlight: dims outside the crop circle and draws the
                  outline. A dark ring UNDER a white ring keeps the boundary
                  visible on both light and dark photos. All one box-shadow (outer
                  scrim + two inset rings) so they can't clobber each other. */}
              {circle > 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: circle,
                    height: circle,
                    boxShadow:
                      "0 0 0 9999px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.9), inset 0 0 0 4px rgba(0,0,0,0.3)",
                  }}
                />
              )}

              {/* Tools, pinned to the top-left of the frame: rotate + reset. */}
              <div className="absolute left-3 top-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotate photo 90 degrees clockwise"
                  title="Rotate photo"
                  className="grid size-9 place-items-center rounded-lg bg-card text-primary shadow-card outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <RotateCw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={resetTransform}
                  aria-label="Reset photo position, zoom and rotation"
                  title="Reset position"
                  className="grid size-9 place-items-center rounded-lg bg-card text-foreground shadow-card outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            </div>

            {/* Zoom: clickable out/in icons flanking a draggable slider. */}
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => stepZoom(-0.25)}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                title="Zoom out"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40"
              >
                <ZoomOut className="size-4" />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="photo-zoom w-full cursor-pointer appearance-none outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${zoomPct}%, var(--muted) ${zoomPct}%)`,
                }}
              />
              <button
                type="button"
                onClick={() => stepZoom(0.25)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
          </>
        )}

        {/* Actions: side-by-side, stacked (Save on top) on very small screens. */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full bg-muted py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:opacity-60 disabled:shadow-none"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
