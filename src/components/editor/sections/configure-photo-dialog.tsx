"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, RotateCw, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Diameter of the on-screen crop circle, and of the exported avatar. */
const VIEW = 288;
const OUT = 512;
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
 * Once `src` is set the drop zone is replaced by the crop stage: the circle
 * shows exactly what becomes the avatar, the slider zooms, dragging (or the
 * arrow keys) repositions, and the rotate button turns the photo 90 degrees.
 * Save re-draws that same transform onto a square canvas at `OUT` pixels.
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
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset the transform whenever a new image is loaded (or the dialog reopens).
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
  }, [src, open]);

  /**
   * Scale that makes the (possibly rotated) image exactly cover the circle at
   * zoom 1. Rotating by 90 or 270 swaps which edge has to do the covering.
   */
  const coverScale = useCallback(() => {
    if (!natural) return 1;
    const swapped = rotation % 180 !== 0;
    const w = swapped ? natural.h : natural.w;
    const h = swapped ? natural.w : natural.h;
    return VIEW / Math.min(w, h);
  }, [natural, rotation]);

  /**
   * Clamp the offset so the image never uncovers the circle - dragging can move
   * the photo, but not off the edge leaving a bare wedge.
   */
  const clamp = useCallback(
    (o: Offset): Offset => {
      if (!natural) return { x: 0, y: 0 };
      const s = coverScale() * zoom;
      const swapped = rotation % 180 !== 0;
      const w = (swapped ? natural.h : natural.w) * s;
      const h = (swapped ? natural.w : natural.h) * s;
      const maxX = Math.max(0, (w - VIEW) / 2);
      const maxY = Math.max(0, (h - VIEW) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [natural, zoom, rotation, coverScale]
  );

  // Re-clamp when zoom or rotation shrinks the allowed travel.
  useEffect(() => {
    setOffset((o) => clamp(o));
  }, [zoom, rotation, clamp]);

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

  /** Re-draw the on-screen transform onto a square canvas and hand back a JPEG. */
  function save() {
    if (!src || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const k = OUT / VIEW; // view pixels -> output pixels
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
  const canSave = !!src && !!natural && !busy;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-md">
        <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Configure photo
        </DialogTitle>
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
          /* Loaded: crop stage */
          <>
            <div className="relative mx-auto mt-2" style={{ width: VIEW, height: VIEW }}>
              <div
                role="application"
                aria-label="Drag to reposition the photo, or use the arrow keys"
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={onKeyDown}
                className="relative size-full cursor-grab touch-none overflow-hidden rounded-full bg-muted outline-none ring-offset-2 ring-offset-card active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  onLoad={(e) =>
                    setNatural({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                  style={
                    natural
                      ? {
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: natural.w * s,
                          height: natural.h * s,
                          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                        }
                      : { opacity: 0 }
                  }
                />
              </div>

              {/* Rotate, pinned to the top-left of the stage. */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label="Rotate 90 degrees clockwise"
                className="absolute -left-1 -top-1 grid size-10 place-items-center rounded-full bg-card text-foreground shadow-card outline-none ring-1 ring-border transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <RotateCw className="size-4" />
              </button>
            </div>

            {/* Zoom */}
            <div className="mt-5 flex items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
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
            className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:opacity-60 disabled:shadow-none"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
