"use client";

import { Plus, type LucideIcon } from "lucide-react";
import {
  useResumeStore,
  DEFAULT_SECTION_ORDER,
  type AdditionalType,
  type SectionKey,
} from "@/features/resume-builder/store/resume-store";
import { SectionHeading } from "./field";
import { EditorFooter } from "../section-footer";
import { SECTION_META } from "../section-nav";
import {
  ADDITIONAL_CONFIG,
  ADDITIONAL_ORDER,
  REPEATABLE_TYPES,
  nextSectionTitle,
} from "./additional-config";

/** Built-in sections a user is allowed to delete (and therefore re-add here). */
const REMOVABLE: ReadonlySet<SectionKey> = new Set([
  "employment",
  "education",
  "skills",
  "summary",
]);

/** One "+ Section name" tile. Adding is the only action, so the whole card is the button. */
function AddSectionCard({
  label,
  icon: Icon,
  onAdd,
}: {
  label: string;
  icon: LucideIcon;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${label}`}
      // Same v9 add-button recipe as AddMoreButton / "Show additional details":
      // no fill, blue outline + blue icon/label, light-blue accent fill on hover.
      className="group flex items-center gap-3 rounded-[6px] border-[1.5px] border-primary/50 bg-transparent px-4 py-3.5 text-left text-primary outline-none transition-colors hover:border-primary hover:bg-accent hover:text-primary-strong focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <Plus className="size-4 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * Grid of optional sections to add to the resume. Clicking one appends it, drops
 * it into the sidebar, and opens its blank form.
 *
 * A section is only offered while it is missing: once added, its tile leaves the
 * grid, so this page always answers "what else could I add?". Custom sections
 * are the exception - they repeat without limit. Built-in sections the user has
 * deleted are offered back here too; deleting one must never be a one-way door.
 */
export function AdditionalPicker({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const addAdditionalSection = useResumeStore((s) => s.addAdditionalSection);
  const additional = useResumeStore((s) => s.additional);
  const order = useResumeStore((s) => s.sectionOrder);
  const restoreSection = useResumeStore((s) => s.restoreSection);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);

  // Core sections the user deleted, in their canonical order.
  const removed = DEFAULT_SECTION_ORDER.filter(
    (k: SectionKey) => REMOVABLE.has(k) && !order.includes(k)
  );

  // Offer a type only while the resume has none of it (custom always repeats).
  const countOf = (type: AdditionalType) =>
    additional.filter((a) => a.type === type).length;
  const available = ADDITIONAL_ORDER.filter(
    (type) => REPEATABLE_TYPES.has(type) || countOf(type) === 0
  );

  return (
    <div>
      <SectionHeading
        title="Additional section"
        description="Add extra sections only if they are relevant to the role you are targeting."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Deleted core sections come first: getting one back matters more than
            adding an optional extra. */}
        {removed.map((key) => (
          <AddSectionCard
            key={key}
            label={SECTION_META[key].label}
            icon={SECTION_META[key].icon}
            onAdd={() => {
              restoreSection(key);
              setActiveSection(key);
            }}
          />
        ))}

        {available.map((type: AdditionalType) => (
          <AddSectionCard
            key={type}
            label={ADDITIONAL_CONFIG[type].label}
            icon={ADDITIONAL_CONFIG[type].icon}
            // addAdditionalSection also makes the new section active, so its
            // blank form opens straight away.
            onAdd={() => addAdditionalSection(type, nextSectionTitle(type))}
          />
        ))}
      </div>

      <EditorFooter onBack={onBack} onNext={onNext} />
    </div>
  );
}
