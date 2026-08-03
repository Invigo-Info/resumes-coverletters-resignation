"use client";

import { useRef, useState } from "react";
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/utilities/utils";

/** Drag-and-drop wiring for a reorderable card. Omit to make the card static. */
export interface DragProps {
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  /** True while this card is the one being dragged. */
  dragging: boolean;
  /** True while this card is the drop target. */
  over: boolean;
  /** Keyboard fallback: move the card without a pointer. */
  onMove: (dir: "up" | "down") => void;
}

/**
 * Collapsible card wrapping one repeatable entry (a job, school, etc.) with a
 * title/subtitle header and an expand/collapse control. Open state can be
 * controlled (for accordion behaviour) or self-managed. Pass `drag` to make the
 * card reorderable via its grip handle.
 *
 * The grip and the delete button sit *outside* the card's border, flanking it,
 * so the card itself reads as a single clean surface. Both are `h-12` so their
 * icons land on the title's baseline whether or not a subtitle is present.
 */
export function EntryCard({
  title,
  subtitle,
  onDelete,
  deleteLabel = "Delete entry",
  defaultOpen = true,
  open: openProp,
  onToggle,
  onActivate,
  drag,
  children,
}: {
  title: string;
  subtitle?: string;
  onDelete: () => void;
  deleteLabel?: string;
  defaultOpen?: boolean;
  /** Controlled open state (for accordion behaviour). Omit for self-managed. */
  open?: boolean;
  onToggle?: () => void;
  /** Fired when this entry is interacted with - used to highlight it in the
   *  preview. */
  onActivate?: () => void;
  drag?: DragProps;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  // The card surface, used as the drag image so the whole card follows the grip.
  const cardRef = useRef<HTMLDivElement>(null);
  // Controlled if `open` prop is passed; otherwise track open state internally.
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const toggle = () => {
    if (isControlled) onToggle?.();
    else setInternalOpen((v) => !v);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault(); // required, or the drop never fires
        drag.onDragOver(drag.index);
      }}
      onDrop={(e) => {
        if (!drag) return;
        e.preventDefault();
        drag.onDrop();
      }}
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      className={cn(
        // From `sm` up the section panel has 36px of padding, so each 28px
        // control hangs into that gutter (-32px) and the card lands back on the
        // heading's width. Below `sm` there is no room, so they stay in flow.
        // The left offset is conditional: without a grip there is nothing there
        // to hang, and the card would overshoot the panel edge.
        "flex items-start gap-0.5 transition-opacity duration-200 sm:-mr-8 sm:gap-1",
        drag && "sm:-ml-8",
        drag?.dragging && "opacity-40"
      )}
    >
      {drag && (
        <button
          type="button"
          aria-label={`Reorder ${title || "entry"}. Use the up and down arrow keys.`}
          // Only the grip is draggable, so selecting text inside the card is a
          // normal text selection - not an accidental card drag. The whole card
          // is used as the drag image so it still visibly follows the pointer.
          draggable
          onDragStart={(e) => {
            drag.onDragStart(drag.index);
            if (cardRef.current) {
              e.dataTransfer.setDragImage(cardRef.current, 20, 20);
            }
          }}
          onDragEnd={() => drag.onDragEnd()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              drag.onMove("up");
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              drag.onMove("down");
            }
          }}
          className="grid h-12 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-muted-foreground/60 outline-none transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <div
        ref={cardRef}
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-border bg-card transition-all duration-200",
          drag?.over && !drag.dragging && "border-primary ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
          <button
            onClick={toggle}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {title || "Untitled"}
              </p>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </button>

          <button
            onClick={toggle}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>

        {open && <div className="border-t border-border p-4">{children}</div>}
      </div>

      {/* Outside the card, so deleting is never a mis-click on Collapse. */}
      <button
        onClick={onDelete}
        aria-label={deleteLabel}
        className="grid h-12 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/** Full-width "add another entry" button shown beneath a list of entry cards. */
export function AddMoreButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-muted px-5 py-4 text-left font-semibold text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span className="text-lg leading-none">+</span>
      {label}
    </button>
  );
}
