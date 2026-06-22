"use client";

import { Plus } from "lucide-react";
import { useResumeStore, type AdditionalType } from "@/lib/store/resume-store";
import { SectionHeading } from "./field";
import { EditorFooter } from "../section-footer";
import { ADDITIONAL_CONFIG, ADDITIONAL_ORDER } from "./additional-config";

/**
 * Grid of buttons to add an extra resume section; each click appends a new
 * section of that type to the store.
 */
export function AdditionalPicker({
  onBack,
  onReorder,
  onNext,
}: {
  onBack: () => void;
  onReorder: () => void;
  onNext: () => void;
}) {
  const addAdditionalSection = useResumeStore((s) => s.addAdditionalSection);

  return (
    <div>
      <SectionHeading
        title="Additional section"
        description="Add extra sections only if they are relevant to the role you are targeting."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADDITIONAL_ORDER.map((type: AdditionalType) => {
          const cfg = ADDITIONAL_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => addAdditionalSection(type, cfg.title)}
              className="flex items-center gap-3 rounded-xl bg-muted px-4 py-4 text-left transition-colors hover:bg-muted/70"
            >
              <Icon className="size-5 shrink-0 text-foreground" />
              <span className="flex-1 font-medium text-foreground">
                {cfg.label}
              </span>
              <Plus className="size-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <EditorFooter onBack={onBack} onReorder={onReorder} onNext={onNext} />
    </div>
  );
}
