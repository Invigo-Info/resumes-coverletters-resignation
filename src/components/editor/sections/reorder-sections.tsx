"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Lock,
  GripVertical,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useResumeStore, type SectionKey } from "@/lib/store/resume-store";
import { SECTION_META } from "../section-nav";
import { ADDITIONAL_CONFIG } from "./additional-config";
import { SectionHeading } from "./field";
import { PrimaryButton, GhostButton } from "@/components/brand/brand-buttons";

function useMeta() {
  const additional = useResumeStore((s) => s.additional);
  return (key: SectionKey) => {
    if (SECTION_META[key]) return SECTION_META[key];
    const sec = additional.find((a) => a.id === key);
    if (sec)
      return {
        label: sec.title,
        icon: ADDITIONAL_CONFIG[sec.type].icon,
        reorderable: true,
      };
    return null;
  };
}

/** Sections that can't be dragged and are pinned to the very end (e.g. summary). */
const PINNED_END: SectionKey[] = ["summary"];

function LockedRow({
  label,
  Icon,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5">
      <Lock className="size-4 text-muted-foreground" />
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 font-medium text-foreground">{label}</span>
    </div>
  );
}

function SortableRow({
  id,
  label,
  Icon,
  onDelete,
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
}: {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 ${
        isDragging ? "z-10 shadow-card-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 font-medium text-foreground">{label}</span>

      {/* Up/down move buttons (alternative to dragging) */}
      <div className="flex items-center overflow-hidden rounded-lg ring-1 ring-border">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canUp}
          aria-label={`Move ${label} up`}
          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="size-4" />
        </button>
        <span className="h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canDown}
          aria-label={`Move ${label} down`}
          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <button
        onClick={onDelete}
        aria-label="Remove section"
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ReorderSections({
  onAddSection,
  onDone,
}: {
  onAddSection: () => void;
  onDone: () => void;
}) {
  const order = useResumeStore((s) => s.sectionOrder);
  const setOrder = useResumeStore((s) => s.setSectionOrder);
  const removeAdditional = useResumeStore((s) => s.removeAdditionalSection);
  const moveSection = useResumeStore((s) => s.moveSection);
  const meta = useMeta();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const isMovable = (k: SectionKey) => meta(k)?.reorderable === true;
  // personal / contact stay at the top; summary stays pinned at the bottom;
  // everything reorderable (incl. additional sections) moves freely in between.
  const leadingLocked = order.filter(
    (k) => !isMovable(k) && !PINNED_END.includes(k)
  );
  const movable = order.filter(isMovable);
  const trailingLocked = order.filter((k) => PINNED_END.includes(k));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = movable.indexOf(active.id as string);
    const newIdx = movable.indexOf(over.id as string);
    const next = arrayMove(movable, oldIdx, newIdx);
    setOrder([...leadingLocked, ...next, ...trailingLocked]);
  }

  function remove(key: SectionKey) {
    const isAdditional = !SECTION_META[key];
    if (isAdditional) removeAdditional(key);
    else setOrder(order.filter((k) => k !== key));
  }

  return (
    <div>
      <SectionHeading
        title="Reorder sections"
        description="Drag sections to change their order. The first sections are locked in place."
      />

      <div className="space-y-2">
        {/* Locked at the top (personal, contact) */}
        {leadingLocked.map((key) => {
          const m = meta(key)!;
          return <LockedRow key={key} label={m.label} Icon={m.icon} />;
        })}

        {/* Draggable (employment, education, skills, additional sections) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={movable} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {movable.map((key, i) => {
                const m = meta(key)!;
                return (
                  <SortableRow
                    key={key}
                    id={key}
                    label={m.label}
                    Icon={m.icon}
                    onDelete={() => remove(key)}
                    canUp={i > 0}
                    canDown={i < movable.length - 1}
                    onMoveUp={() => moveSection(key, "up")}
                    onMoveDown={() => moveSection(key, "down")}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Pinned to the bottom (professional summary) */}
        {trailingLocked.map((key) => {
          const m = meta(key)!;
          return <LockedRow key={key} label={m.label} Icon={m.icon} />;
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
        <GhostButton onClick={onDone}>
          <ChevronLeft className="size-4" />
          Back
        </GhostButton>
        <button
          onClick={onAddSection}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-4" />
          Add section
        </button>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    </div>
  );
}
